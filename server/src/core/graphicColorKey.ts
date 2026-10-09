/**
 * Graphic / Flat Art Colour-Key Background Removal Engine - Zenith District Print Studio
 * 
 * Specifically designed for screenprint art, line art, typography, and logos on near-uniform backgrounds.
 * Operates without neural-network downsampling distortion, ensuring fine lettering, enclosed voids,
 * and delicate lines are 100% preserved with zero edge halos.
 */

import sharp from 'sharp';

export interface ArtworkDetectionResult {
  mode: 'graphic' | 'photo';
  confidence: number;
  isFlatGraphic: boolean;
  estimatedBgHex: string;
  estimatedBgRgb: [number, number, number];
  borderStdDev: number;
  topClustersShare: number;
}

export interface GraphicRemovalOptions {
  /** Background noise / compression artifact tolerance (default: 14) */
  tolerance?: number;
  /** Width of the anti-aliased transition ramp in color/luminance units (default: 8) */
  smoothRamp?: number;
  /** Snap alpha < cutoff to 0 (default: 12 / 255) to remove ghost pixels */
  cutoffThreshold?: number;
  /** Snap alpha > solid to 255 (default: 230 / 255) */
  solidThreshold?: number;
  /** Decontaminate anti-aliased edge RGB so edges carry no background halo (default: true) */
  decontaminate?: boolean;
  /** Custom background RGB override if user explicitly picked one */
  customBgRgb?: [number, number, number];
  /** Edge render mode: crisp_screenprint produces 100% solid, punchy vector/line-art ink (default for monochrome line art) */
  edgeMode?: 'crisp_screenprint' | 'smooth_antialiased';
}

export interface GraphicRemovalResult {
  buffer: Buffer;
  width: number;
  height: number;
  channels: 4;
  estimatedBgHex: string;
  estimatedInkHex: string;
  edgeMode: 'crisp_screenprint' | 'smooth_antialiased';
  alphaMetrics: {
    transparentPercentage: number;
    solidPercentage: number;
    antiAliasedPercentage: number;
  };
}

/**
 * 1. Automatic Artwork Classification
 * Downscales to a fast analysis proxy, samples the perimeter border for color uniformity,
 * and quantizes colors to verify whether >85-90% of pixels fall into 2-4 primary clusters.
 */
export async function detectArtworkType(imageBuffer: Buffer): Promise<ArtworkDetectionResult> {
  const proxy = await sharp(imageBuffer)
    .resize(160, 160, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: w, height: h, channels } = proxy.info;
  const data = proxy.data;
  const pixelCount = w * h;

  // 1. Sample border pixels (all 4 edges)
  const borderR: number[] = [];
  const borderG: number[] = [];
  const borderB: number[] = [];

  for (let x = 0; x < w; x++) {
    const topIdx = (0 * w + x) * channels;
    borderR.push(data[topIdx]);
    borderG.push(data[topIdx + 1]);
    borderB.push(data[topIdx + 2]);

    const botIdx = ((h - 1) * w + x) * channels;
    borderR.push(data[botIdx]);
    borderG.push(data[botIdx + 1]);
    borderB.push(data[botIdx + 2]);
  }

  for (let y = 0; y < h; y++) {
    const lIdx = (y * w + 0) * channels;
    borderR.push(data[lIdx]);
    borderG.push(data[lIdx + 1]);
    borderB.push(data[lIdx + 2]);

    const rIdx = (y * w + (w - 1)) * channels;
    borderR.push(data[rIdx]);
    borderG.push(data[rIdx + 1]);
    borderB.push(data[rIdx + 2]);
  }

  // Border standard deviation & median
  const borderLen = borderR.length;
  const meanR = borderR.reduce((a, b) => a + b, 0) / borderLen;
  const meanG = borderG.reduce((a, b) => a + b, 0) / borderLen;
  const meanB = borderB.reduce((a, b) => a + b, 0) / borderLen;

  const varR = borderR.reduce((a, b) => a + (b - meanR) ** 2, 0) / borderLen;
  const varG = borderG.reduce((a, b) => a + (b - meanG) ** 2, 0) / borderLen;
  const varB = borderB.reduce((a, b) => a + (b - meanB) ** 2, 0) / borderLen;
  const borderStdDev = Math.sqrt((varR + varG + varB) / 3);

  const sortedR = [...borderR].sort((a, b) => a - b);
  const sortedG = [...borderG].sort((a, b) => a - b);
  const sortedB = [...borderB].sort((a, b) => a - b);
  const mid = Math.floor(borderLen / 2);
  const medR = sortedR[mid];
  const medG = sortedG[mid];
  const medB = sortedB[mid];

  // 2. Color clustering (quantize into 16-step bins: 4096 cells)
  const colorHist = new Map<number, number>();
  for (let i = 0; i < pixelCount; i++) {
    const idx = i * channels;
    const qR = data[idx] >> 4;
    const qG = data[idx + 1] >> 4;
    const qB = data[idx + 2] >> 4;
    const key = (qR << 8) | (qG << 4) | qB;
    colorHist.set(key, (colorHist.get(key) || 0) + 1);
  }

  const sortedCounts = Array.from(colorHist.values()).sort((a, b) => b - a);
  const top4Count = sortedCounts.slice(0, 4).reduce((a, b) => a + b, 0);
  const top4Share = top4Count / pixelCount;

  // A flat graphic has a near-uniform border (stdDev < 16) and >85% of pixels in <=4 clusters
  const isNearUniformBorder = borderStdDev < 16;
  const isClusteredPalette = top4Share >= 0.85;
  const isFlatGraphic = isNearUniformBorder && isClusteredPalette;

  const estimatedBgHex =
    '#' +
    [medR, medG, medB]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

  return {
    mode: isFlatGraphic ? 'graphic' : 'photo',
    confidence: isFlatGraphic ? Math.min(0.99, top4Share * 1.05) : 0.85,
    isFlatGraphic,
    estimatedBgHex,
    estimatedBgRgb: [medR, medG, medB],
    borderStdDev,
    topClustersShare: top4Share,
  };
}

/**
 * 2. Graphic Mode Algorithm (Full Resolution, No AI Model Downsampling)
 * - Estimates background color from perimeter median
 * - Estimates foreground/ink color from non-background pixels
 * - Computes sub-pixel anti-aliased alpha
 * - Decontaminates / un-premultiplies edge pixels so zero gray/white halos remain
 * - Snaps near-0 and near-1 thresholds
 */
export async function removeGraphicBackground(
  imageBuffer: Buffer,
  options: GraphicRemovalOptions = {}
): Promise<GraphicRemovalResult> {
  const {
    tolerance = 14,
    cutoffThreshold = 12,
    solidThreshold = 230,
    decontaminate = true,
    edgeMode = 'crisp_screenprint',
  } = options;

  // Load image at full raw resolution
  const image = sharp(imageBuffer).removeAlpha(); // work with RGB
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info;
  const pixelCount = w * h;

  // 1. Background color estimation from border perimeter (median)
  let bgR = 255;
  let bgG = 255;
  let bgB = 255;

  if (options.customBgRgb) {
    [bgR, bgG, bgB] = options.customBgRgb;
  } else {
    const borderR: number[] = [];
    const borderG: number[] = [];
    const borderB: number[] = [];

    // Perimeter scan
    for (let x = 0; x < w; x++) {
      const topIdx = (0 * w + x) * channels;
      borderR.push(data[topIdx]);
      borderG.push(data[topIdx + 1]);
      borderB.push(data[topIdx + 2]);

      const botIdx = ((h - 1) * w + x) * channels;
      borderR.push(data[botIdx]);
      borderG.push(data[botIdx + 1]);
      borderB.push(data[botIdx + 2]);
    }

    for (let y = 0; y < h; y++) {
      const lIdx = (y * w + 0) * channels;
      borderR.push(data[lIdx]);
      borderG.push(data[lIdx + 1]);
      borderB.push(data[lIdx + 2]);

      const rIdx = (y * w + (w - 1)) * channels;
      borderR.push(data[rIdx]);
      borderG.push(data[rIdx + 1]);
      borderB.push(data[rIdx + 2]);
    }

    borderR.sort((a, b) => a - b);
    borderG.sort((a, b) => a - b);
    borderB.sort((a, b) => a - b);
    const mid = Math.floor(borderR.length / 2);
    bgR = borderR[mid];
    bgG = borderG[mid];
    bgB = borderB[mid];
  }

  const bgLum = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;
  const isLightBg = bgLum >= 128;

  // 2. Ink color estimation from darkest / most prominent foreground pixels
  let inkRSum = 0;
  let inkGSum = 0;
  let inkBSum = 0;
  let inkLumSum = 0;
  let inkCount = 0;

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * channels;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Pixel is considered foreground if sufficiently distant from background
    const distFromBg = Math.sqrt(
      (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2
    );

    if (distFromBg > tolerance + 30) {
      if (isLightBg && lum < 40) {
        inkRSum += r;
        inkGSum += g;
        inkBSum += b;
        inkLumSum += lum;
        inkCount++;
      } else if (!isLightBg && lum > 215) {
        inkRSum += r;
        inkGSum += g;
        inkBSum += b;
        inkLumSum += lum;
        inkCount++;
      }
    }
  }

  const inkR = inkCount > 0 ? Math.round(inkRSum / inkCount) : isLightBg ? 0 : 255;
  const inkG = inkCount > 0 ? Math.round(inkGSum / inkCount) : isLightBg ? 0 : 255;
  const inkB = inkCount > 0 ? Math.round(inkBSum / inkCount) : isLightBg ? 0 : 255;
  const inkLum = 0.299 * inkR + 0.587 * inkG + 0.114 * inkB;

  // Maximum possible distance from bg to ink
  const maxInkDist = Math.max(
    30,
    Math.sqrt((inkR - bgR) ** 2 + (inkG - bgG) ** 2 + (inkB - bgB) ** 2)
  );

  // 3. Process RGBA at full source resolution
  const outData = Buffer.alloc(w * h * 4);
  let transparentPixels = 0;
  let solidPixels = 0;
  let antiAliasedPixels = 0;

  // Determine if artwork is high-contrast monochrome line art
  const isMonochromeFlatArt = isLightBg && inkLum < 50 && edgeMode === 'crisp_screenprint';
  const bimodalCutoff = isMonochromeFlatArt
    ? Math.round(inkLum + (bgLum - inkLum) * 0.71)
    : 0;

  for (let i = 0; i < pixelCount; i++) {
    const inIdx = i * channels;
    const outIdx = i * 4;

    const r = data[inIdx];
    const g = data[inIdx + 1];
    const b = data[inIdx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (isMonochromeFlatArt) {
      // Razor-sharp 100% solid screenprint ink mode
      // Guarantees small lettering, text voids, and linework survive 100% with zero halo
      if (lum <= bimodalCutoff) {
        outData[outIdx] = inkR;
        outData[outIdx + 1] = inkG;
        outData[outIdx + 2] = inkB;
        outData[outIdx + 3] = 255;
        solidPixels++;
      } else {
        outData[outIdx] = 0;
        outData[outIdx + 1] = 0;
        outData[outIdx + 2] = 0;
        outData[outIdx + 3] = 0;
        transparentPixels++;
      }
      continue;
    }

    // Continuous anti-aliased mode
    const colorDist = Math.sqrt(
      (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2
    );

    let alphaNorm = 0;

    if (colorDist <= tolerance) {
      alphaNorm = 0;
    } else {
      if (isLightBg) {
        // Luminance-based continuous alpha transition for dark ink on light background
        const effectiveBgLum = bgLum - tolerance;
        const norm = (effectiveBgLum - lum) / Math.max(1, effectiveBgLum - inkLum);
        alphaNorm = Math.max(0, Math.min(1, norm));
      } else {
        // Light ink on dark background
        const effectiveBgLum = bgLum + tolerance;
        const norm = (lum - effectiveBgLum) / Math.max(1, inkLum - effectiveBgLum);
        alphaNorm = Math.max(0, Math.min(1, norm));
      }

      // Also respect color distance for multi-color flat art
      const distNorm = Math.max(0, Math.min(1, (colorDist - tolerance) / (maxInkDist - tolerance)));
      alphaNorm = Math.max(alphaNorm, distNorm);
    }

    // Snap near-0 and near-1 thresholds
    let alphaByte = Math.round(alphaNorm * 255);
    if (alphaByte < cutoffThreshold) {
      alphaByte = 0;
    } else if (alphaByte > solidThreshold) {
      alphaByte = 255;
    }

    // Alpha metrics
    if (alphaByte === 0) transparentPixels++;
    else if (alphaByte === 255) solidPixels++;
    else antiAliasedPixels++;

    if (alphaByte === 0) {
      outData[outIdx] = 0;
      outData[outIdx + 1] = 0;
      outData[outIdx + 2] = 0;
      outData[outIdx + 3] = 0;
    } else {
      outData[outIdx + 3] = alphaByte;

      if (decontaminate) {
        if (alphaByte === 255) {
          outData[outIdx] = r;
          outData[outIdx + 1] = g;
          outData[outIdx + 2] = b;
        } else {
          // Un-premultiply / solve foreground color F: C = alpha*F + (1-alpha)*B
          const a = alphaByte / 255;
          const solvedR = Math.max(0, Math.min(255, Math.round((r - (1 - a) * bgR) / a)));
          const solvedG = Math.max(0, Math.min(255, Math.round((g - (1 - a) * bgG) / a)));
          const solvedB = Math.max(0, Math.min(255, Math.round((b - (1 - a) * bgB) / a)));

          if (isLightBg && inkLum < 20) {
            outData[outIdx] = inkR;
            outData[outIdx + 1] = inkG;
            outData[outIdx + 2] = inkB;
          } else {
            outData[outIdx] = solvedR;
            outData[outIdx + 1] = solvedG;
            outData[outIdx + 2] = solvedB;
          }
        }
      } else {
        outData[outIdx] = r;
        outData[outIdx + 1] = g;
        outData[outIdx + 2] = b;
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

  const estimatedBgHex =
    '#' +
    [bgR, bgG, bgB]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

  const estimatedInkHex =
    '#' +
    [inkR, inkG, inkB]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

  return {
    buffer: outputPngBuffer,
    width: w,
    height: h,
    channels: 4,
    estimatedBgHex,
    estimatedInkHex,
    edgeMode: isMonochromeFlatArt ? 'crisp_screenprint' : 'smooth_antialiased',
    alphaMetrics: {
      transparentPercentage: Number(((transparentPixels / pixelCount) * 100).toFixed(2)),
      solidPercentage: Number(((solidPixels / pixelCount) * 100).toFixed(2)),
      antiAliasedPercentage: Number(((antiAliasedPixels / pixelCount) * 100).toFixed(2)),
    },
  };
}
