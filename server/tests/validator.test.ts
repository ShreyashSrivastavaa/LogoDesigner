import { describe, it, expect } from 'vitest';
import { validatePrintProject } from '../src/core/validator.js';

describe('Validation Engine Unit Tests', () => {
  it('returns "ready" when artwork meets all print criteria', () => {
    // 3600x4800 artwork placed centered in 12x16 print area @ 300 DPI (canvas 3600x4800)
    // with 0.5 in safe margin (150px)
    const result = validatePrintProject({
      printWidthIn: 12,
      printHeightIn: 16,
      dpi: 300,
      exportFormat: 'PNG',
      safeMarginIn: 0.5,
      artwork: {
        sourceWidthPx: 3000,
        sourceHeightPx: 4000,
        originalWidthPx: 3000,
        originalHeightPx: 4000,
        placedX: 300,
        placedY: 400,
        placedWidthPx: 3000,
        placedHeightPx: 4000,
        hasAlpha: true,
      },
    });

    expect(result.status).toBe('ready');
    expect(result.canExport).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.metrics.effectiveDpi).toBe(300);
  });

  it('returns "needs_upscale" and blocks export when DPI is below 150', () => {
    // 600x800 image placed across 10x10 inches: effective DPI = 600/10 = 60 DPI
    const result = validatePrintProject({
      printWidthIn: 10,
      printHeightIn: 10,
      dpi: 300,
      exportFormat: 'PNG',
      artwork: {
        sourceWidthPx: 600,
        sourceHeightPx: 800,
        originalWidthPx: 600,
        originalHeightPx: 800,
        placedX: 200,
        placedY: 200,
        placedWidthPx: 2600,
        placedHeightPx: 2600,
        hasAlpha: true,
      },
    });

    expect(result.status).toBe('needs_upscale');
    expect(result.canExport).toBe(false);
    expect(result.errors.some((e) => e.includes('150 DPI'))).toBe(true);
  });

  it('returns "check_dimensions" when artwork extends outside canvas boundary', () => {
    // Canvas is 3600x4800, artwork placed at X: 2000, width: 2500 -> Right edge is 4500 (exceeds 3600)
    const result = validatePrintProject({
      printWidthIn: 12,
      printHeightIn: 16,
      dpi: 300,
      exportFormat: 'PNG',
      artwork: {
        sourceWidthPx: 3000,
        sourceHeightPx: 3000,
        originalWidthPx: 3000,
        originalHeightPx: 3000,
        placedX: 2000,
        placedY: 200,
        placedWidthPx: 2500,
        placedHeightPx: 2500,
        hasAlpha: true,
      },
    });

    expect(result.status).toBe('check_dimensions');
    expect(result.canExport).toBe(false);
    expect(result.errors.some((e) => e.includes('exceeds the printable boundary'))).toBe(true);
  });

  it('returns "ready_with_warnings" when DPI is acceptable (150-299) or violates safe margin', () => {
    // Effective DPI 200 (acceptable for DTG), within safe margin
    const result = validatePrintProject({
      printWidthIn: 10,
      printHeightIn: 10,
      dpi: 300,
      exportFormat: 'PNG',
      safeMarginIn: 0.5, // 150px
      artwork: {
        sourceWidthPx: 2000,
        sourceHeightPx: 2000,
        originalWidthPx: 2000,
        originalHeightPx: 2000,
        placedX: 50, // Violates 150px safe margin
        placedY: 200,
        placedWidthPx: 2800,
        placedHeightPx: 2800,
        hasAlpha: true,
      },
    });

    expect(result.status).toBe('ready_with_warnings');
    expect(result.canExport).toBe(true);
    expect(result.warnings.some((w) => w.includes('safe area'))).toBe(true);
  });

  it('warns when exporting JPEG with transparent artwork', () => {
    const result = validatePrintProject({
      printWidthIn: 10,
      printHeightIn: 10,
      dpi: 300,
      exportFormat: 'JPEG',
      artwork: {
        sourceWidthPx: 3000,
        sourceHeightPx: 3000,
        originalWidthPx: 3000,
        originalHeightPx: 3000,
        placedX: 200,
        placedY: 200,
        placedWidthPx: 2600,
        placedHeightPx: 2600,
        hasAlpha: true,
      },
    });

    expect(result.warnings.some((w) => w.includes('JPEG will discard transparency'))).toBe(true);
  });

  it('flags opaque box backgrounds from pixel analysis', () => {
    const result = validatePrintProject({
      printWidthIn: 10,
      printHeightIn: 10,
      dpi: 300,
      exportFormat: 'PNG',
      artwork: {
        sourceWidthPx: 3000,
        sourceHeightPx: 3000,
        originalWidthPx: 3000,
        originalHeightPx: 3000,
        placedX: 200,
        placedY: 200,
        placedWidthPx: 2600,
        placedHeightPx: 2600,
        hasAlpha: true,
      },
      pixelAnalysis: {
        hasAlpha: true,
        semiTransparentPercent: 2,
        strayLowAlphaPercent: 0,
        touchesEdges: { top: false, bottom: false, left: false, right: false, any: false },
        opaqueBoxSuspected: true,
        cornerAlphas: [255, 255, 255, 255],
      },
    });

    expect(result.warnings.some((w) => w.includes('Opaque background box detected'))).toBe(true);
  });

  it('flags file size exceeding Qikink 25 MB limit as hard error', () => {
    const result = validatePrintProject({
      printWidthIn: 12,
      printHeightIn: 16,
      dpi: 300,
      exportFormat: 'PNG',
      artwork: {
        sourceWidthPx: 3600,
        sourceHeightPx: 4800,
        originalWidthPx: 3600,
        originalHeightPx: 4800,
        placedX: 100,
        placedY: 100,
        placedWidthPx: 3400,
        placedHeightPx: 4600,
        hasAlpha: true,
      },
      fileSizeBytes: 28 * 1024 * 1024, // 28 MB
    });

    expect(result.errors.some((e) => e.includes('exceeds Qikink\'s maximum upload limit'))).toBe(true);
    expect(result.canExport).toBe(false);
  });
});
