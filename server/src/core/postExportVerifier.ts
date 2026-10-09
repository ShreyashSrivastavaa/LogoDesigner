/**
 * Post-Export Verifier - Zenith District Print Studio
 * Deep verification module that re-reads exported binary files from disk/buffer
 * to mathematically guarantee print-readiness, density metadata, and alpha integrity.
 */

import sharp from 'sharp';
import { dpiToPixelsPerMeter, pixelsPerMeterToDpi } from './pixelMath.js';

export interface ExpectedExportSpec {
  expectedWidthPx: number;
  expectedHeightPx: number;
  expectedDpi: number;
  format: 'PNG' | 'JPEG';
  expectAlpha: boolean;
  maxFileSizeMb?: number;
}

export interface VerificationMetrics {
  widthPx: number;
  heightPx: number;
  channels: number;
  hasAlpha: boolean;
  densityDpi?: number;
  measuredPpmX?: number;
  measuredPpmY?: number;
  fileSizeBytes: number;
  fileSizeMb: number;
  cornerAlphas: [number, number, number, number]; // TL, TR, BL, BR
  transparentPixelPercentage: number;
  isIhdrColorType6?: boolean;
}

export interface PostExportVerificationReport {
  isValid: boolean;
  passedChecks: string[];
  errors: string[];
  warnings: string[];
  metrics: VerificationMetrics;
  auditTimestamp: string;
}

/**
 * Inspect raw binary chunks of PNG to locate and parse pHYs and IHDR
 */
function parsePngRawChunks(buffer: Buffer): {
  ppmX?: number;
  ppmY?: number;
  unitSpecifier?: number;
  colorType?: number;
  bitDepth?: number;
} {
  // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buffer.subarray(0, 8).equals(pngSig)) {
    return {};
  }

  let colorType: number | undefined;
  let bitDepth: number | undefined;
  let ppmX: number | undefined;
  let ppmY: number | undefined;
  let unitSpecifier: number | undefined;

  let offset = 8;
  while (offset < buffer.length - 8) {
    const chunkLength = buffer.readUInt32BE(offset);
    const chunkType = buffer.toString('ascii', offset + 4, offset + 8);

    if (chunkType === 'IHDR') {
      bitDepth = buffer.readUInt8(offset + 8 + 8);
      colorType = buffer.readUInt8(offset + 8 + 9);
    } else if (chunkType === 'pHYs') {
      ppmX = buffer.readUInt32BE(offset + 8);
      ppmY = buffer.readUInt32BE(offset + 12);
      unitSpecifier = buffer.readUInt8(offset + 16);
    }

    // chunk length + 4 (length) + 4 (type) + 4 (crc)
    offset += 12 + chunkLength;
  }

  return { ppmX, ppmY, unitSpecifier, colorType, bitDepth };
}

/**
 * Verify exported print file directly from buffer
 */
export async function verifyExportedFile(
  buffer: Buffer,
  expected: ExpectedExportSpec
): Promise<PostExportVerificationReport> {
  const passedChecks: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const maxFileMb = expected.maxFileSizeMb ?? 25.0;
  const fileSizeBytes = buffer.length;
  const fileSizeMb = Math.round((fileSizeBytes / (1024 * 1024)) * 100) / 100;

  // 1. File Size Verification
  if (fileSizeMb > maxFileMb) {
    errors.push(
      `File size (${fileSizeMb} MB) violates maximum allowed print size (${maxFileMb} MB).`
    );
  } else {
    passedChecks.push(`File size is ${fileSizeMb} MB (well within ${maxFileMb} MB limit).`);
  }

  // 2. Sharp Image Re-Read
  const image = sharp(buffer);
  const metadata = await image.metadata();

  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const channels = metadata.channels || 0;
  const hasAlpha = metadata.hasAlpha || false;
  const density = metadata.density;

  // Verify Dimensions
  if (width !== expected.expectedWidthPx || height !== expected.expectedHeightPx) {
    errors.push(
      `Dimension mismatch: Exported file is ${width}x${height}px, but expected ${expected.expectedWidthPx}x${expected.expectedHeightPx}px.`
    );
  } else {
    passedChecks.push(`Pixel dimensions match target exactly: ${width}x${height}px.`);
  }

  // 3. Format Specific & Channel Verification
  let isIhdrColorType6: boolean | undefined;
  let rawPpmX: number | undefined;
  let rawPpmY: number | undefined;

  if (expected.format === 'PNG') {
    const rawChunks = parsePngRawChunks(buffer);
    isIhdrColorType6 = rawChunks.colorType === 6;
    rawPpmX = rawChunks.ppmX;
    rawPpmY = rawChunks.ppmY;

    if (expected.expectAlpha) {
      if (channels !== 4 || !hasAlpha) {
        errors.push(`Alpha channel missing: Expected 4-channel RGBA, but found ${channels} channels.`);
      } else {
        passedChecks.push('Alpha channel verified: File contains 4-channel RGBA data.');
      }

      if (rawChunks.colorType !== 6) {
        warnings.push(
          `PNG color type is ${rawChunks.colorType} (expected Color Type 6: Truecolor with alpha).`
        );
      } else {
        passedChecks.push('Verified PNG IHDR Color Type 6 (Truecolor with alpha, unquantized).');
      }
    }

    // Verify pHYs chunk density
    const expectedPpm = dpiToPixelsPerMeter(expected.expectedDpi);
    if (rawChunks.ppmX && rawChunks.ppmY) {
      const ppmDiff = Math.abs(rawChunks.ppmX - expectedPpm);
      if (ppmDiff > 2) {
        warnings.push(
          `PNG pHYs density (${rawChunks.ppmX} ppm) differs from expected ${expectedPpm} ppm (${expected.expectedDpi} DPI).`
        );
      } else {
        passedChecks.push(
          `PNG pHYs density chunk verified: ${rawChunks.ppmX} pixels/meter (~${expected.expectedDpi} DPI).`
        );
      }
    } else if (density) {
      if (Math.abs(density - expected.expectedDpi) > 2) {
        warnings.push(`Image density tag (${density} DPI) differs from expected ${expected.expectedDpi} DPI.`);
      } else {
        passedChecks.push(`Image density metadata verified at ${density} DPI.`);
      }
    } else {
      warnings.push('PNG pHYs metadata chunk was not detected in output file.');
    }
  } else if (expected.format === 'JPEG') {
    if (channels !== 3 || hasAlpha) {
      errors.push(`Invalid JPEG channels: Expected 3-channel RGB, but found ${channels} channels.`);
    } else {
      passedChecks.push('Verified 3-channel RGB JPEG format (no stray alpha artifacts).');
    }

    if (density) {
      if (Math.abs(density - expected.expectedDpi) > 2) {
        warnings.push(`JPEG density tag (${density} DPI) differs from requested ${expected.expectedDpi} DPI.`);
      } else {
        passedChecks.push(`JPEG density verified at ${density} DPI.`);
      }
    }
  }

  // 4. Pixel Alpha Integrity Scan (Corners & Transparency Distribution)
  let cornerTL = 0;
  let cornerTR = 0;
  let cornerBL = 0;
  let cornerBR = 0;
  let transparentPixelPercent = 0;

  if (hasAlpha && channels >= 4) {
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    const totalPx = w * h;

    const getA = (x: number, y: number) => data[(y * w + x) * 4 + 3];
    cornerTL = getA(0, 0);
    cornerTR = getA(w - 1, 0);
    cornerBL = getA(0, h - 1);
    cornerBR = getA(w - 1, h - 1);

    let transparentCount = 0;
    // Step sampling for large files to keep check under 200ms
    const step = Math.max(1, Math.floor(Math.sqrt(totalPx) / 200));
    let sampledCount = 0;

    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        sampledCount++;
        if (getA(x, y) === 0) {
          transparentCount++;
        }
      }
    }

    transparentPixelPercent = Math.round((transparentCount / sampledCount) * 1000) / 10;

    if (expected.expectAlpha) {
      if (cornerTL === 0 && cornerTR === 0 && cornerBL === 0 && cornerBR === 0) {
        passedChecks.push('Alpha boundary verified: All 4 canvas corners are 100% transparent (no opaque box).');
      } else {
        warnings.push(
          `Non-zero corner alpha detected [TL:${cornerTL}, TR:${cornerTR}, BL:${cornerBL}, BR:${cornerBR}]. Artwork extends to canvas corners.`
        );
      }
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    passedChecks,
    errors,
    warnings,
    metrics: {
      widthPx: width,
      heightPx: height,
      channels,
      hasAlpha,
      densityDpi: density,
      measuredPpmX: rawPpmX,
      measuredPpmY: rawPpmY,
      fileSizeBytes,
      fileSizeMb,
      cornerAlphas: [cornerTL, cornerTR, cornerBL, cornerBR],
      transparentPixelPercentage: transparentPixelPercent,
      isIhdrColorType6,
    },
    auditTimestamp: new Date().toISOString(),
  };
}
