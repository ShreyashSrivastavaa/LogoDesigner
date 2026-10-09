import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  detectArtworkType,
  removeGraphicBackground,
} from '../src/core/graphicColorKey.js';
import { applyPhotoDetailSafetyNet } from '../src/core/photoSafetyNet.js';
import { LocalRembgProvider } from '../src/providers/bgRemoval/localRembgProvider.js';

describe('Graphic Mode & Flat Art Background Removal Tests', () => {
  // Helper to generate a test fixture with #f0f0f0 background, thin lines, and enclosed lettering
  async function generateFlatGraphicFixture(): Promise<{
    buffer: Buffer;
    inkPixelCoords: Array<[number, number]>;
    bgPixelCoords: Array<[number, number]>;
    letterCoords: Array<[number, number]>;
  }> {
    const width = 500;
    const height = 500;

    // SVG with #f0f0f0 background, black ink lines, and text
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#F0F0F0"/>
        <!-- Thin line 1px -->
        <line x1="50" y1="50" x2="450" y2="50" stroke="#000000" stroke-width="2"/>
        <!-- Thin line 2px -->
        <line x1="50" y1="50" x2="450" y2="50" stroke="#000000" stroke-width="2"/>
        <!-- Thin line 1px pixel-aligned -->
        <rect x="50" y="100" width="400" height="1" fill="#000000"/>
        <!-- Enclosed box with lettering inside -->
        <rect x="150" y="150" width="200" height="200" fill="#000000"/>
        <!-- Small lettering inside the body (white text on black body) -->
        <text x="250" y="260" font-family="sans-serif" font-size="28" font-weight="bold" fill="#F0F0F0" text-anchor="middle">SPIDER</text>
        <!-- Fine text below -->
        <text x="250" y="420" font-family="sans-serif" font-size="20" font-weight="bold" fill="#000000" text-anchor="middle">ZENITH ART</text>
      </svg>
    `;

    const buffer = await sharp(Buffer.from(svg))
      .png() // PNG fixture for exact subpixel assertions
      .toBuffer();

    // Sample coordinates
    const bgPixelCoords: Array<[number, number]> = [
      [10, 10],
      [490, 10],
      [10, 490],
      [490, 490],
      [20, 250],
      [480, 250],
    ];

    const inkPixelCoords: Array<[number, number]> = [
      [250, 50], // on thin line
      [250, 100], // on 1px line
      [160, 160], // on black box
      [340, 340], // on black box
    ];

    const origRaw = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const letterCoords: Array<[number, number]> = [];
    for (let y = 405; y <= 425; y++) {
      for (let x = 180; x <= 320; x++) {
        const idx = (y * width + x) * 3;
        const lum = 0.299 * origRaw.data[idx] + 0.587 * origRaw.data[idx + 1] + 0.114 * origRaw.data[idx + 2];
        if (lum < 30) {
          letterCoords.push([x, y]);
        }
      }
    }

    return { buffer, inkPixelCoords, bgPixelCoords, letterCoords };
  }

  it('(1) Auto-detection classifies flat art as graphic and photos as photo', async () => {
    const fixture = await generateFlatGraphicFixture();
    const result = await detectArtworkType(fixture.buffer);

    expect(result.isFlatGraphic).toBe(true);
    expect(result.mode).toBe('graphic');
    expect(result.borderStdDev).toBeLessThan(15);
    expect(result.topClustersShare).toBeGreaterThanOrEqual(0.85);
    expect(result.estimatedBgHex).toBe('#F0F0F0');

    // Contrast with synthetic photo (wide color gradient across borders)
    const photoBuffer = Buffer.alloc(200 * 200 * 3);
    for (let y = 0; y < 200; y++) {
      for (let x = 0; x < 200; x++) {
        const idx = (y * 200 + x) * 3;
        photoBuffer[idx] = Math.floor((x / 200) * 255);
        photoBuffer[idx + 1] = Math.floor((y / 200) * 255);
        photoBuffer[idx + 2] = Math.floor(((x + y) / 400) * 255);
      }
    }
    const photoPng = await sharp(photoBuffer, {
      raw: { width: 200, height: 200, channels: 3 },
    })
      .png()
      .toBuffer();

    const photoDetection = await detectArtworkType(photoPng);
    expect(photoDetection.mode).toBe('photo');
    expect(photoDetection.isFlatGraphic).toBe(false);
  });

  it('(a) Black text and thin lines on #f0f0f0 -> ink pixels keep alpha >= 250, bg alpha 0, small letters survive', async () => {
    const fixture = await generateFlatGraphicFixture();
    const result = await removeGraphicBackground(fixture.buffer, {
      tolerance: 14,
    });

    const { data, info } = await sharp(result.buffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Assert background pixels have alpha == 0
    for (const [x, y] of fixture.bgPixelCoords) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      expect(alpha).toBe(0);
    }

    // Assert ink pixels keep alpha >= 250
    for (const [x, y] of fixture.inkPixelCoords) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      expect(alpha).toBeGreaterThanOrEqual(250);
    }

    // Assert small letters survive
    for (const [x, y] of fixture.letterCoords) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      expect(alpha).toBeGreaterThanOrEqual(200);
    }
  });

  it('(b) Edge pixels contain no grey/white contamination (decontaminated ink color)', async () => {
    const fixture = await generateFlatGraphicFixture();
    const result = await removeGraphicBackground(fixture.buffer, {
      tolerance: 14,
      decontaminate: true,
      edgeMode: 'smooth_antialiased',
    });

    const { data, info } = await sharp(result.buffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    let antiAliasedFound = 0;
    for (let i = 0; i < info.width * info.height; i++) {
      const alpha = data[i * 4 + 3];
      if (alpha > 0 && alpha < 255) {
        antiAliasedFound++;
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];

        // For dark ink on light background, decontaminated RGB must NOT contain light background spill (>128)
        expect(r).toBeLessThanOrEqual(50);
        expect(g).toBeLessThanOrEqual(50);
        expect(b).toBeLessThanOrEqual(50);
      }
    }

    expect(antiAliasedFound).toBeGreaterThan(0);
  });

  it('(c) Output is RGBA colour type 6 (Truecolor with Alpha)', async () => {
    const fixture = await generateFlatGraphicFixture();
    const result = await removeGraphicBackground(fixture.buffer);

    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe('png');
    expect(meta.channels).toBe(4);
    expect(meta.hasAlpha).toBe(true);

    // Verify PNG IHDR Color Type 6 directly from binary bytes
    // PNG IHDR chunk is at byte offset 12: width (4), height (4), bit depth (1), color type (1)
    // Offset 12 + 4 + 4 + 1 = 25 (0-indexed byte 25 is Color Type)
    const colorType = result.buffer.readUInt8(25);
    expect(colorType).toBe(6); // 6 = Truecolor with Alpha (RGBA)
  });

  it('(d) Original input image buffer is completely untouched and immutable', async () => {
    const fixture = await generateFlatGraphicFixture();
    const hashBefore = crypto.createHash('sha256').update(fixture.buffer).digest('hex');

    await removeGraphicBackground(fixture.buffer);

    const hashAfter = crypto.createHash('sha256').update(fixture.buffer).digest('hex');
    expect(hashAfter).toBe(hashBefore);
  });

  it('(e) Live spider graphic test: 100% of dark ink and fine text survives in Graphic Mode', async () => {
    const spiderPath = path.resolve(process.cwd(), 'data', 'storage', 'ffbb3645-a446-4256-83fa-9b762bfc885f.jpg');
    if (!fs.existsSync(spiderPath)) return;

    const spiderBuf = fs.readFileSync(spiderPath);
    const result = await removeGraphicBackground(spiderBuf, { tolerance: 14 });

    const origRaw = await sharp(spiderBuf).raw().toBuffer({ resolveWithObject: true });
    const outRaw = await sharp(result.buffer).raw().toBuffer({ resolveWithObject: true });

    let totalDarkInk = 0;
    let survivingDarkInk = 0;

    for (let i = 0; i < origRaw.info.width * origRaw.info.height; i++) {
      const r = origRaw.data[i * 3];
      const g = origRaw.data[i * 3 + 1];
      const b = origRaw.data[i * 3 + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (lum < 50) {
        totalDarkInk++;
        if (outRaw.data[i * 4 + 3] > 0) {
          survivingDarkInk++;
        }
      }
    }

    // 100% of dark ink pixels (including fine lettering inside the spider) must survive!
    expect(survivingDarkInk).toBe(totalDarkInk);
    expect(survivingDarkInk).toBeGreaterThan(50000);

    // Verify 100.00% exact pixel match with user uploaded target image
    const userRefPath = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\9e0b0f2c-caae-4f33-a4a9-848e7e671c88\\.user_uploaded\\media_1791543934532.png';
    if (fs.existsSync(userRefPath)) {
      const refRaw = await sharp(userRefPath).raw().toBuffer({ resolveWithObject: true });
      let exactMatches = 0;
      const totalPixels = origRaw.info.width * origRaw.info.height;
      for (let i = 0; i < totalPixels; i++) {
        const outA = outRaw.data[i * 4 + 3];
        const refA = refRaw.data[i * 4 + 3];
        if (outA === refA) exactMatches++;
      }
      expect(exactMatches / totalPixels).toBeGreaterThanOrEqual(0.9999); // 99.99% exact match!
    }
  });

  it('(f) Photo Mode Safety Net restores 100% of deleted fine lettering inside subject bounding box', async () => {
    const spiderPath = path.resolve(process.cwd(), 'data', 'storage', 'ffbb3645-a446-4256-83fa-9b762bfc885f.jpg');
    if (!fs.existsSync(spiderPath)) return;

    const spiderBuf = fs.readFileSync(spiderPath);
    const provider = new LocalRembgProvider();

    // Run Photo mode with preserveFineDetail: true
    const resultWithSafety = await provider.removeBackground(spiderBuf, {
      mode: 'photo',
      preserveFineDetail: true,
    });

    expect(resultWithSafety.effectiveMode).toBe('photo');
    expect(resultWithSafety.restoredPixelsCount).toBeGreaterThan(1000);

    const origRaw = await sharp(spiderBuf).raw().toBuffer({ resolveWithObject: true });
    const outRaw = await sharp(resultWithSafety.buffer).raw().toBuffer({ resolveWithObject: true });

    let totalDarkInk = 0;
    let survivingDarkInk = 0;

    for (let i = 0; i < origRaw.info.width * origRaw.info.height; i++) {
      const lum =
        0.299 * origRaw.data[i * 3] +
        0.587 * origRaw.data[i * 3 + 1] +
        0.114 * origRaw.data[i * 3 + 2];

      if (lum < 50) {
        totalDarkInk++;
        if (outRaw.data[i * 4 + 3] >= 128) {
          survivingDarkInk++;
        }
      }
    }

    // All dark ink inside the subject bounding box survived
    expect(survivingDarkInk).toBe(totalDarkInk);
  }, 30000);
});
