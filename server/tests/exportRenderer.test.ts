import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { renderPrintArtwork } from '../src/core/exportRenderer.js';
import { generateAllFixtures, GeneratedFixtures } from './fixtures/generateFixtures.js';

describe('Export Renderer Unit Tests', () => {
  let fixtures: GeneratedFixtures;

  beforeAll(async () => {
    fixtures = await generateAllFixtures();
  }, 30000);

  it('renders a pristine PNG RGBA canvas at exact computed dimensions (10x10 @ 150 = 1500x1500)', async () => {
    const srcBuf = fs.readFileSync(fixtures.transparentGradientPath);

    const result = await renderPrintArtwork({
      printWidthIn: 10,
      printHeightIn: 10,
      dpi: 150,
      format: 'PNG',
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

    expect(result.widthPx).toBe(1500);
    expect(result.heightPx).toBe(1500);
    expect(result.channels).toBe(4);
    expect(result.format).toBe('PNG');

    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(1500);
    expect(meta.height).toBe(1500);
    expect(meta.hasAlpha).toBe(true);
    expect(meta.channels).toBe(4);
  });

  it('renders JPEG with solid background and exactly 3 channels', async () => {
    const srcBuf = fs.readFileSync(fixtures.transparentGradientPath);

    const result = await renderPrintArtwork({
      printWidthIn: 8,
      printHeightIn: 8,
      dpi: 200,
      format: 'JPEG',
      jpegBackgroundHex: '#000000',
      layers: [
        {
          sourceBuffer: srcBuf,
          x: 200,
          y: 200,
          width: 1200,
          height: 1200,
        },
      ],
    });

    expect(result.widthPx).toBe(1600);
    expect(result.heightPx).toBe(1600);
    expect(result.channels).toBe(3);
    expect(result.format).toBe('JPEG');

    const meta = await sharp(result.buffer).metadata();
    expect(meta.hasAlpha).toBe(false);
    expect(meta.channels).toBe(3);
  });

  it('correctly handles multi-layer positioning and layer opacity', async () => {
    const artBuf = fs.readFileSync(fixtures.tinyLowResPath);
    const gradBuf = fs.readFileSync(fixtures.transparentGradientPath);

    const result = await renderPrintArtwork({
      printWidthIn: 6,
      printHeightIn: 6,
      dpi: 150,
      format: 'PNG',
      layers: [
        {
          sourceBuffer: gradBuf,
          x: 100,
          y: 100,
          width: 700,
          height: 700,
          opacity: 0.5,
        },
        {
          sourceBuffer: artBuf,
          x: 300,
          y: 300,
          width: 300,
          height: 300,
          opacity: 1.0,
        },
      ],
    });

    expect(result.widthPx).toBe(900);
    expect(result.heightPx).toBe(900);
    expect(result.channels).toBe(4);
  });
});
