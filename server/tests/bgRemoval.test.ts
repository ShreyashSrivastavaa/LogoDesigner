import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { LocalRembgProvider } from '../src/providers/bgRemoval/localRembgProvider.js';

describe('Background Removal Provider Unit Tests', () => {
  it('removes solid background: asserts corners have alpha 0, subject center has alpha 255, and output is RGBA', async () => {
    const width = 400;
    const height = 400;

    // Create fixture image with a known solid white background and a centered dark emblem
    const inputBuffer = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }, // Known solid white background
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 200,
              height: 200,
              channels: 3,
              background: { r: 15, g: 15, b: 15 }, // Centered dark emblem subject
            },
          })
            .png()
            .toBuffer(),
          left: 100,
          top: 100,
        },
      ])
      .png()
      .toBuffer();

    const provider = new LocalRembgProvider();
    expect(await provider.isAvailable()).toBe(true);

    const result = await provider.removeBackground(inputBuffer);

    // Verify output structure
    expect(result.channels).toBe(4);
    expect(result.width).toBe(width);
    expect(result.height).toBe(height);
    expect(result.buffer).toBeInstanceOf(Buffer);

    // Verify Sharp image channels and alpha
    const image = sharp(result.buffer);
    const meta = await image.metadata();
    expect(meta.hasAlpha).toBe(true);
    expect(meta.channels).toBe(4);
    expect(meta.format).toBe('png');

    // Sample raw pixel data
    const { data } = await image.raw().toBuffer({ resolveWithObject: true });
    const getAlpha = (x: number, y: number) => data[(y * width + x) * 4 + 3];

    // Assert all 4 corners have alpha 0 (pure transparent, no white box)
    expect(getAlpha(0, 0)).toBe(0);
    expect(getAlpha(width - 1, 0)).toBe(0);
    expect(getAlpha(0, height - 1)).toBe(0);
    expect(getAlpha(width - 1, height - 1)).toBe(0);

    // Assert subject center has alpha 255 (solid graphic preserved)
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    expect(getAlpha(centerX, centerY)).toBe(255);
  }, 30000);
});
