/**
 * Programmatic Fixture Generator - Zenith District Print Studio
 * Generates verified test fixtures conforming to Section 8 testing requirements.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export interface GeneratedFixtures {
  fixturesDir: string;
  transparentGradientPath: string;
  rgbOpaquePath: string;
  tinyLowResPath: string;
  whiteBoxBgPath: string;
  edgeTouchingPath: string;
  largeSamplePath: string;
}

export async function generateAllFixtures(targetDir?: string): Promise<GeneratedFixtures> {
  const dir = targetDir || path.resolve(process.cwd(), 'tests', 'fixtures');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const transparentGradientPath = path.join(dir, 'transparent-gradient.png');
  const rgbOpaquePath = path.join(dir, 'rgb-opaque.jpg');
  const tinyLowResPath = path.join(dir, 'tiny-lowres.png');
  const whiteBoxBgPath = path.join(dir, 'white-box-bg.png');
  const edgeTouchingPath = path.join(dir, 'edge-touching.png');
  const largeSamplePath = path.join(dir, 'large-sample.png');

  // 1. Transparent PNG with known alpha gradient (400x400)
  // Transparent corners (alpha = 0), radial gradient circle in center
  const w1 = 400;
  const h1 = 400;
  const buf1 = Buffer.alloc(w1 * h1 * 4);
  const cx1 = w1 / 2;
  const cy1 = h1 / 2;
  const r1 = 150;

  for (let y = 0; y < h1; y++) {
    for (let x = 0; x < w1; x++) {
      const idx = (y * w1 + x) * 4;
      const dist = Math.hypot(x - cx1, y - cy1);
      if (dist <= r1) {
        const factor = 1 - dist / r1;
        buf1[idx] = 255; // Red
        buf1[idx + 1] = 60; // Green
        buf1[idx + 2] = 20; // Blue
        buf1[idx + 3] = Math.round(factor * 255); // Alpha gradient
      } else {
        buf1[idx] = 0;
        buf1[idx + 1] = 0;
        buf1[idx + 2] = 0;
        buf1[idx + 3] = 0; // Pure transparent
      }
    }
  }
  await sharp(buf1, { raw: { width: w1, height: h1, channels: 4 } })
    .png()
    .toFile(transparentGradientPath);

  // 2. RGB-only JPEG (800x600, no alpha)
  await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: { r: 30, g: 30, b: 35 },
    },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 300,
            height: 300,
            channels: 3,
            background: { r: 240, g: 180, b: 40 },
          },
        })
          .png()
          .toBuffer(),
        left: 250,
        top: 150,
      },
    ])
    .jpeg({ quality: 95 })
    .toFile(rgbOpaquePath);

  // 3. Tiny 200px low-resolution artwork
  await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 140,
            height: 140,
            channels: 4,
            background: { r: 180, g: 40, b: 220, alpha: 1 },
          },
        })
          .png()
          .toBuffer(),
        left: 30,
        top: 30,
      },
    ])
    .png()
    .toFile(tinyLowResPath);

  // 4. White box background (opaque corners)
  await sharp({
    create: {
      width: 600,
      height: 600,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 300,
            height: 300,
            channels: 4,
            background: { r: 20, g: 20, b: 20, alpha: 1 },
          },
        })
          .png()
          .toBuffer(),
        left: 150,
        top: 150,
      },
    ])
    .png()
    .toFile(whiteBoxBgPath);

  // 5. Artwork touching canvas borders (for clipping & safe margin detection)
  const w5 = 500;
  const h5 = 500;
  const buf5 = Buffer.alloc(w5 * h5 * 4, 0);
  // Draw an 'X' crossing edge-to-edge
  for (let i = 0; i < 500; i++) {
    // Diagonal 1
    const idx1 = (i * w5 + i) * 4;
    buf5[idx1] = 255;
    buf5[idx1 + 1] = 255;
    buf5[idx1 + 2] = 255;
    buf5[idx1 + 3] = 255;
    // Diagonal 2
    const idx2 = (i * w5 + (w5 - 1 - i)) * 4;
    buf5[idx2] = 255;
    buf5[idx2 + 1] = 255;
    buf5[idx2 + 2] = 255;
    buf5[idx2 + 3] = 255;
  }
  await sharp(buf5, { raw: { width: w5, height: h5, channels: 4 } })
    .png()
    .toFile(edgeTouchingPath);

  // 6. Large high-res sample (6000x8000 for memory and integrity testing)
  // We create this efficiently using sharp solid with pattern
  await sharp({
    create: {
      width: 6000,
      height: 8000,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
    limitInputPixels: 500_000_000,
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 4000,
            height: 5000,
            channels: 4,
            background: { r: 200, g: 50, b: 80, alpha: 0.9 },
          },
        })
          .png()
          .toBuffer(),
        left: 1000,
        top: 1500,
      },
    ])
    .png({ compressionLevel: 6 })
    .toFile(largeSamplePath);

  return {
    fixturesDir: dir,
    transparentGradientPath,
    rgbOpaquePath,
    tinyLowResPath,
    whiteBoxBgPath,
    edgeTouchingPath,
    largeSamplePath,
  };
}
