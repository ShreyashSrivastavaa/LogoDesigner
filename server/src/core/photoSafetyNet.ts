/**
 * Photo Mode Safety Net - Zenith District Print Studio
 * 
 * Protects fine lettering, delicate linework, and enclosed details inside or near
 * the AI subject bounding box by performing a UNION operation between the AI mask
 * and any high-contrast foreground pixel that differs from the background.
 */

import sharp from 'sharp';

export interface PhotoSafetyNetOptions {
  /** Padding around the AI subject bounding box (in pixels, default: 20) */
  paddingPx?: number;
  /** Tolerance threshold for distinguishing detail from background (default: 18) */
  detailTolerance?: number;
  /** Minimum AI alpha value to contribute to bounding box (default: 25) */
  minAiAlphaForBox?: number;
}

export interface PhotoSafetyNetResult {
  buffer: Buffer;
  width: number;
  height: number;
  channels: 4;
  restoredPixelsCount: number;
  boundingBox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export async function applyPhotoDetailSafetyNet(
  origBuffer: Buffer,
  aiBuffer: Buffer,
  options: PhotoSafetyNetOptions = {}
): Promise<PhotoSafetyNetResult> {
  const {
    paddingPx = 20,
    detailTolerance = 18,
    minAiAlphaForBox = 25,
  } = options;

  const origImage = sharp(origBuffer).removeAlpha();
  const { data: origData, info: origInfo } = await origImage.raw().toBuffer({ resolveWithObject: true });

  const aiImage = sharp(aiBuffer).ensureAlpha();
  const { data: aiData, info: aiInfo } = await aiImage.raw().toBuffer({ resolveWithObject: true });

  const w = origInfo.width;
  const h = origInfo.height;
  const origChannels = origInfo.channels;
  const pixelCount = w * h;

  // 1. Locate Subject Bounding Box from AI Mask
  let minX = w;
  let maxX = 0;
  let minY = h;
  let maxY = 0;
  let foundSubject = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = aiData[(y * w + x) * 4 + 3];
      if (alpha >= minAiAlphaForBox) {
        foundSubject = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If AI model found no subject at all, return original AI buffer
  if (!foundSubject) {
    return {
      buffer: aiBuffer,
      width: w,
      height: h,
      channels: 4,
      restoredPixelsCount: 0,
      boundingBox: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
    };
  }

  // Apply padding margin
  const boxMinX = Math.max(0, minX - paddingPx);
  const boxMaxX = Math.min(w - 1, maxX + paddingPx);
  const boxMinY = Math.max(0, minY - paddingPx);
  const boxMaxY = Math.min(h - 1, maxY + paddingPx);

  // 2. Estimate Background Color from Perimeter
  const borderR: number[] = [];
  const borderG: number[] = [];
  const borderB: number[] = [];

  for (let x = 0; x < w; x++) {
    const topIdx = (0 * w + x) * origChannels;
    borderR.push(origData[topIdx]);
    borderG.push(origData[topIdx + 1]);
    borderB.push(origData[topIdx + 2]);

    const botIdx = ((h - 1) * w + x) * origChannels;
    borderR.push(origData[botIdx]);
    borderG.push(origData[botIdx + 1]);
    borderB.push(origData[botIdx + 2]);
  }

  for (let y = 0; y < h; y++) {
    const lIdx = (y * w + 0) * origChannels;
    borderR.push(origData[lIdx]);
    borderG.push(origData[lIdx + 1]);
    borderB.push(origData[lIdx + 2]);

    const rIdx = (y * w + (w - 1)) * origChannels;
    borderR.push(origData[rIdx]);
    borderG.push(origData[rIdx + 1]);
    borderB.push(origData[rIdx + 2]);
  }

  borderR.sort((a, b) => a - b);
  borderG.sort((a, b) => a - b);
  borderB.sort((a, b) => a - b);
  const mid = Math.floor(borderR.length / 2);
  const bgR = borderR[mid];
  const bgG = borderG[mid];
  const bgB = borderB[mid];
  const bgLum = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;
  const isLightBg = bgLum >= 128;

  // Estimate ink luminance
  let inkLumSum = 0;
  let inkCount = 0;
  for (let i = 0; i < pixelCount; i++) {
    const r = origData[i * origChannels];
    const g = origData[i * origChannels + 1];
    const b = origData[i * origChannels + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (isLightBg && lum < 40) {
      inkLumSum += lum;
      inkCount++;
    } else if (!isLightBg && lum > 215) {
      inkLumSum += lum;
      inkCount++;
    }
  }
  const inkLum = inkCount > 0 ? inkLumSum / inkCount : isLightBg ? 0 : 255;

  // 3. UNION Safety Net: Iterate within subject bounding box
  const outData = Buffer.from(aiData);
  let restoredPixelsCount = 0;

  for (let y = boxMinY; y <= boxMaxY; y++) {
    for (let x = boxMinX; x <= boxMaxX; x++) {
      const origIdx = (y * w + x) * origChannels;
      const aiIdx = (y * w + x) * 4;

      const r = origData[origIdx];
      const g = origData[origIdx + 1];
      const b = origData[origIdx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      const colorDist = Math.sqrt(
        (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2
      );

      // If pixel is clearly different from background, compute detail alpha
      if (colorDist > detailTolerance) {
        let detailAlphaNorm = 0;
        if (isLightBg) {
          const effectiveBg = bgLum - detailTolerance;
          detailAlphaNorm = Math.max(0, Math.min(1, (effectiveBg - lum) / Math.max(1, effectiveBg - inkLum)));
        } else {
          const effectiveBg = bgLum + detailTolerance;
          detailAlphaNorm = Math.max(0, Math.min(1, (lum - effectiveBg) / Math.max(1, inkLum - effectiveBg)));
        }

        const detailAlphaByte = Math.round(detailAlphaNorm * 255);
        const currentAlpha = outData[aiIdx + 3];

        if (detailAlphaByte > currentAlpha) {
          outData[aiIdx + 3] = detailAlphaByte;
          if (currentAlpha < 128 && detailAlphaByte >= 128) {
            restoredPixelsCount++;
          }
          // Restore true foreground RGB colors if AI has blanked them
          outData[aiIdx] = r;
          outData[aiIdx + 1] = g;
          outData[aiIdx + 2] = b;
        }
      }
    }
  }

  // Encode as PNG Truecolor RGBA (Color Type 6)
  const outputPngBuffer = await sharp(outData, {
    raw: {
      width: w,
      height: h,
      channels: 4,
    },
  })
    .png({
      compressionLevel: 9,
      palette: false,
    })
    .toBuffer();

  return {
    buffer: outputPngBuffer,
    width: w,
    height: h,
    channels: 4,
    restoredPixelsCount,
    boundingBox: {
      minX: boxMinX,
      maxX: boxMaxX,
      minY: boxMinY,
      maxY: boxMaxY,
    },
  };
}
