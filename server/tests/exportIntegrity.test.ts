import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { renderPrintArtwork } from '../src/core/exportRenderer.js';
import { verifyExportedFile } from '../src/core/postExportVerifier.js';
import { generateAllFixtures, GeneratedFixtures } from './fixtures/generateFixtures.js';

describe('Export Integrity & Section 8 Compliance Tests', () => {
  let fixtures: GeneratedFixtures;

  beforeAll(async () => {
    fixtures = await generateAllFixtures();
  }, 30000);

  it('verifies exact dimensions, PNG IHDR Color Type 6, pHYs density, and alpha preservation', async () => {
    const srcBuf = fs.readFileSync(fixtures.transparentGradientPath);
    const originalHash = crypto.createHash('sha256').update(srcBuf).digest('hex');

    // 12x16 inches @ 300 DPI = 3600x4800 pixels
    const renderResult = await renderPrintArtwork({
      printWidthIn: 12,
      printHeightIn: 16,
      dpi: 300,
      format: 'PNG',
      layers: [
        {
          sourceBuffer: srcBuf,
          x: 600,
          y: 800,
          width: 2400,
          height: 2400,
        },
      ],
    });

    // Run deep post-export verifier
    const report = await verifyExportedFile(renderResult.buffer, {
      expectedWidthPx: 3600,
      expectedHeightPx: 4800,
      expectedDpi: 300,
      format: 'PNG',
      expectAlpha: true,
      maxFileSizeMb: 25,
    });

    expect(report.isValid).toBe(true);
    expect(report.errors).toHaveLength(0);

    // Assert specific Section 8 guarantees
    expect(report.metrics.widthPx).toBe(3600);
    expect(report.metrics.heightPx).toBe(4800);
    expect(report.metrics.channels).toBe(4);
    expect(report.metrics.hasAlpha).toBe(true);
    expect(report.metrics.isIhdrColorType6).toBe(true);

    // PNG pHYs density check: 300 DPI = 11811 pixels/meter
    expect(report.metrics.measuredPpmX).toBe(11811);
    expect(report.metrics.measuredPpmY).toBe(11811);

    // Corner alphas must be 0 (no opaque box)
    expect(report.metrics.cornerAlphas).toEqual([0, 0, 0, 0]);

    // Original buffer must remain completely untouched
    const currentSrcBuf = fs.readFileSync(fixtures.transparentGradientPath);
    const postHash = crypto.createHash('sha256').update(currentSrcBuf).digest('hex');
    expect(postHash).toBe(originalHash);
  });

  it('verifies JPEG export: 3 channels, no alpha, density tag set, exact dimensions', async () => {
    const srcBuf = fs.readFileSync(fixtures.transparentGradientPath);

    // 10x10 inches @ 150 DPI = 1500x1500 pixels
    const renderResult = await renderPrintArtwork({
      printWidthIn: 10,
      printHeightIn: 10,
      dpi: 150,
      format: 'JPEG',
      jpegBackgroundHex: '#121212',
      layers: [
        {
          sourceBuffer: srcBuf,
          x: 250,
          y: 250,
          width: 1000,
          height: 1000,
        },
      ],
    });

    const report = await verifyExportedFile(renderResult.buffer, {
      expectedWidthPx: 1500,
      expectedHeightPx: 1500,
      expectedDpi: 150,
      format: 'JPEG',
      expectAlpha: false,
    });

    expect(report.isValid).toBe(true);
    expect(report.metrics.channels).toBe(3);
    expect(report.metrics.hasAlpha).toBe(false);
    expect(report.metrics.widthPx).toBe(1500);
    expect(report.metrics.heightPx).toBe(1500);
  });

  it('rejects tampered or mismatched outputs loudly', async () => {
    const srcBuf = fs.readFileSync(fixtures.transparentGradientPath);

    // Intentionally expect 3600x4800 on an 800x800 render
    const renderResult = await renderPrintArtwork({
      printWidthIn: 4,
      printHeightIn: 4,
      dpi: 200, // 800x800
      format: 'PNG',
      layers: [
        {
          sourceBuffer: srcBuf,
          x: 100,
          y: 100,
          width: 600,
          height: 600,
        },
      ],
    });

    const report = await verifyExportedFile(renderResult.buffer, {
      expectedWidthPx: 3600,
      expectedHeightPx: 4800,
      expectedDpi: 300,
      format: 'PNG',
      expectAlpha: true,
    });

    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.includes('Dimension mismatch'))).toBe(true);
  });

  it('successfully handles large 6000x8000 print export without crashing', async () => {
    // 20x26.67 inches @ 300 DPI = 6000x8000 pixels
    const srcBuf = fs.readFileSync(fixtures.transparentGradientPath);

    const renderResult = await renderPrintArtwork({
      printWidthIn: 20,
      printHeightIn: 26.666667,
      dpi: 300,
      format: 'PNG',
      layers: [
        {
          sourceBuffer: srcBuf,
          x: 1000,
          y: 1000,
          width: 4000,
          height: 4000,
        },
      ],
    });

    expect(renderResult.widthPx).toBe(6000);
    expect(renderResult.heightPx).toBe(8000);
    expect(renderResult.channels).toBe(4);

    const meta = await sharp(renderResult.buffer).metadata();
    expect(meta.width).toBe(6000);
    expect(meta.height).toBe(8000);
    expect(meta.hasAlpha).toBe(true);
  }, 45000);
});
