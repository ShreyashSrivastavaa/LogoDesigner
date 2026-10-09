/**
 * Alpha Channel Processing & Defringe Engine - Zenith District Print Studio
 * Advanced edge refinement: choke, expand, defringe, and ghost alpha cleanup.
 */

import sharp from 'sharp';

export interface DefringeOptions {
  /** Snap alpha < threshold to 0 (default: 15 / 255) to eliminate low-alpha ghost noise */
  cutoffThreshold?: number;
  /** Snap alpha > threshold to 255 (default: 245 / 255) */
  solidThreshold?: number;
  /** Choke/erode alpha boundary by N pixels (positive: choke inwards, negative: expand) */
  chokePx?: number;
  /** Color decontamination to remove halo color spill from former background */
  decontaminateColor?: boolean;
}

/**
 * Apply edge refinement, defringing, and alpha noise cleanup
 */
export async function processAlphaDefringe(
  inputBuffer: Buffer,
  options: DefringeOptions = {}
): Promise<Buffer> {
  const {
    cutoffThreshold = 15,
    solidThreshold = 245,
    chokePx = 0,
    decontaminateColor = true,
  } = options;

  const image = sharp(inputBuffer).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const pixelCount = width * height;

  // 1. Alpha cleanup (snap near-0 ghost pixels and near-solid edges)
  const modifiedData = Buffer.from(data);

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const a = modifiedData[idx + 3];

    if (a < cutoffThreshold) {
      modifiedData[idx + 3] = 0;
      if (decontaminateColor) {
        modifiedData[idx] = 0;
        modifiedData[idx + 1] = 0;
        modifiedData[idx + 2] = 0;
      }
    } else if (a > solidThreshold) {
      modifiedData[idx + 3] = 255;
    }
  }

  // 2. Choke / Expand (Morphological erosion/dilation on alpha channel)
  if (chokePx !== 0) {
    const radius = Math.abs(chokePx);
    const alphaMap = Buffer.alloc(pixelCount);
    for (let i = 0; i < pixelCount; i++) {
      alphaMap[i] = modifiedData[i * 4 + 3];
    }

    const processedAlpha = Buffer.alloc(pixelCount);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let val = alphaMap[y * width + x];

        for (let dy = -radius; dy <= radius; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;

          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= width) continue;
            if (dx * dx + dy * dy > radius * radius) continue;

            const neighbor = alphaMap[ny * width + nx];
            if (chokePx > 0) {
              // Erosion (choke inwards)
              val = Math.min(val, neighbor);
            } else {
              // Dilation (expand outwards)
              val = Math.max(val, neighbor);
            }
          }
        }
        processedAlpha[y * width + x] = val;
      }
    }

    for (let i = 0; i < pixelCount; i++) {
      modifiedData[i * 4 + 3] = processedAlpha[i];
    }
  }

  return sharp(modifiedData, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png({ palette: false, compressionLevel: 9 })
    .toBuffer();
}
