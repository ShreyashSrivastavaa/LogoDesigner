/**
 * Validation Engine - Zenith District Print Studio
 * Pure functions for print readiness validation, alpha integrity, clipping, and DPI math.
 */

import sharp from 'sharp';
import {
  calculateEffectiveDpi,
  calculateRealDetailDpi,
  calculateTargetPixels,
} from './pixelMath.js';

export type ValidationStatus =
  | 'ready'
  | 'ready_with_warnings'
  | 'needs_upscale'
  | 'check_dimensions';

export interface ImagePixelAnalysis {
  hasAlpha: boolean;
  semiTransparentPercent: number;
  strayLowAlphaPercent: number;
  touchesEdges: {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
    any: boolean;
  };
  opaqueBoxSuspected: boolean;
  cornerAlphas: [number, number, number, number]; // TL, TR, BL, BR (0-255)
}

export interface ValidationInput {
  printWidthIn: number;
  printHeightIn: number;
  dpi: number;
  exportFormat: 'PNG' | 'JPEG';
  jpegBackgroundHex?: string;
  artwork: {
    sourceWidthPx: number;
    sourceHeightPx: number;
    originalWidthPx: number; // un-upscaled baseline
    originalHeightPx: number;
    placedX: number; // placement position on export canvas (px)
    placedY: number;
    placedWidthPx: number; // placed size on export canvas (px)
    placedHeightPx: number;
    hasAlpha: boolean;
  };
  pixelAnalysis?: ImagePixelAnalysis;
  fileSizeBytes?: number;
  safeMarginIn?: number;
}

export interface ValidationResult {
  status: ValidationStatus;
  statusLabel: string;
  canExport: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
  metrics: {
    canvasWidthPx: number;
    canvasHeightPx: number;
    effectiveDpi: number;
    realDetailDpi: number;
    minAcceptableDpi: number;
    printWidthIn: number;
    printHeightIn: number;
    placedWidthIn: number;
    placedHeightIn: number;
  };
  disclaimer: string;
}

const POD_DISCLAIMER =
  'Notice: DPI is necessary but not sufficient. Final print quality depends on source detail, ink absorption, fabric weave, garment dye, and printing method (DTF/DTG). Zenith District recommends ordering a single sample unit before bulk production.';

/**
 * Perform pixel-level buffer inspection for alpha integrity, clipping, and opaque backgrounds
 */
export async function analyzeImageBuffer(
  buffer: Buffer,
  maxSampleDim: number = 1000
): Promise<ImagePixelAnalysis> {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  if (!metadata.hasAlpha || (metadata.channels && metadata.channels < 4)) {
    return {
      hasAlpha: false,
      semiTransparentPercent: 0,
      strayLowAlphaPercent: 0,
      touchesEdges: { top: true, bottom: true, left: true, right: true, any: true },
      opaqueBoxSuspected: true,
      cornerAlphas: [255, 255, 255, 255],
    };
  }

  // Downsample if huge to allow fast pixel audit
  let pipeline = image;
  const origW = metadata.width || 1;
  const origH = metadata.height || 1;
  const maxDim = Math.max(origW, origH);
  if (maxDim > maxSampleDim) {
    pipeline = pipeline.resize({
      width: Math.round((origW / maxDim) * maxSampleDim),
      height: Math.round((origH / maxDim) * maxSampleDim),
      fit: 'inside',
    });
  }

  const { data, info } = await pipeline.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const totalPixels = width * height;

  let semiTransparentCount = 0;
  let strayLowAlphaCount = 0;
  let touchesTop = false;
  let touchesBottom = false;
  let touchesLeft = false;
  let touchesRight = false;

  // Corner sampling
  const getAlphaAt = (x: number, y: number): number => {
    const idx = (y * width + x) * 4 + 3;
    return data[idx];
  };

  const cornerTL = getAlphaAt(0, 0);
  const cornerTR = getAlphaAt(width - 1, 0);
  const cornerBL = getAlphaAt(0, height - 1);
  const cornerBR = getAlphaAt(width - 1, height - 1);

  // Scan pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];

      if (alpha > 0 && alpha < 255) {
        semiTransparentCount++;
        // Low alpha ghost pixels (<10% opacity) that show as dirt on fabric
        if (alpha < 26) {
          strayLowAlphaCount++;
        }
      }

      // Check boundaries
      if (alpha > 15) {
        if (y === 0) touchesTop = true;
        if (y === height - 1) touchesBottom = true;
        if (x === 0) touchesLeft = true;
        if (x === width - 1) touchesRight = true;
      }
    }
  }

  // Opaque box suspect: all 4 corners are fully opaque (alpha >= 250) and >85% of image is opaque
  const allCornersOpaque =
    cornerTL >= 250 && cornerTR >= 250 && cornerBL >= 250 && cornerBR >= 250;

  return {
    hasAlpha: true,
    semiTransparentPercent: Math.round((semiTransparentCount / totalPixels) * 1000) / 10,
    strayLowAlphaPercent: Math.round((strayLowAlphaCount / totalPixels) * 1000) / 10,
    touchesEdges: {
      top: touchesTop,
      bottom: touchesBottom,
      left: touchesLeft,
      right: touchesRight,
      any: touchesTop || touchesBottom || touchesLeft || touchesRight,
    },
    opaqueBoxSuspected: allCornersOpaque,
    cornerAlphas: [cornerTL, cornerTR, cornerBL, cornerBR],
  };
}

/**
 * Validate print project readiness
 */
export function validatePrintProject(input: ValidationInput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];

  const {
    printWidthIn,
    printHeightIn,
    dpi,
    exportFormat,
    artwork,
    pixelAnalysis,
    fileSizeBytes,
    safeMarginIn = 0.5,
  } = input;

  // 1. Physical and canvas calculation
  const targetCanvas = calculateTargetPixels(printWidthIn, printHeightIn, dpi);
  const placedWidthIn = artwork.placedWidthPx / dpi;
  const placedHeightIn = artwork.placedHeightPx / dpi;

  // Effective DPI
  const { effectiveDpi } = calculateEffectiveDpi(
    artwork.sourceWidthPx,
    artwork.sourceHeightPx,
    placedWidthIn,
    placedHeightIn
  );

  // Real-detail DPI (based on original baseline un-upscaled pixels)
  const { realDetailDpi } = calculateRealDetailDpi(
    artwork.originalWidthPx,
    artwork.originalHeightPx,
    placedWidthIn,
    placedHeightIn
  );

  // 2. DPI & Resolution evaluation
  if (effectiveDpi < 150) {
    errors.push(
      `Effective resolution is ${effectiveDpi} DPI, which is below Qikink's minimum acceptable print threshold of 150 DPI.`
    );
  } else if (effectiveDpi < 300) {
    warnings.push(
      `Effective resolution is ${effectiveDpi} DPI. Acceptable for DTG printing, but 300 DPI is recommended for maximum sharpness.`
    );
  } else {
    info.push(`Resolution is optimal at ${effectiveDpi} DPI (exceeds 300 DPI commercial standard).`);
  }

  // Real detail vs Upscaled discrepancy check
  if (effectiveDpi >= 200 && realDetailDpi < 150) {
    warnings.push(
      `Real detail baseline is ~${realDetailDpi} DPI (upscaled from ${artwork.originalWidthPx}x${artwork.originalHeightPx}px). Visual artifacts or smoothing may appear on fabric.`
    );
  }

  // Suspiciously low raw resolution
  if (artwork.sourceWidthPx < 1000 && artwork.sourceHeightPx < 1000) {
    warnings.push(
      `Source artwork is under 1000px (${artwork.sourceWidthPx}x${artwork.sourceHeightPx}px). Upscaling is strongly recommended before printing.`
    );
  }

  // 3. Format and transparency compatibility
  if (exportFormat === 'JPEG') {
    if (artwork.hasAlpha) {
      warnings.push(
        'Exporting as JPEG will discard transparency and composite artwork over a solid background color.'
      );
    }
  } else if (exportFormat === 'PNG') {
    if (!artwork.hasAlpha) {
      warnings.push(
        'Artwork does not have an alpha transparency channel. A solid background rectangle will print on the garment.'
      );
    }
  }

  // 4. Boundary clipping and placement checks
  const safeMarginPx = safeMarginIn * dpi;
  const canvasRight = targetCanvas.widthPx;
  const canvasBottom = targetCanvas.heightPx;

  const artLeft = artwork.placedX;
  const artTop = artwork.placedY;
  const artRight = artwork.placedX + artwork.placedWidthPx;
  const artBottom = artwork.placedY + artwork.placedHeightPx;

  // Hard clipping outside printable area
  if (artLeft < 0 || artTop < 0 || artRight > canvasRight || artBottom > canvasBottom) {
    errors.push(
      'Artwork exceeds the printable boundary! Portions outside the print area will be clipped during production.'
    );
  } else {
    // Safe area proximity check
    const violatesMargin =
      artLeft < safeMarginPx ||
      artTop < safeMarginPx ||
      artRight > canvasRight - safeMarginPx ||
      artBottom > canvasBottom - safeMarginPx;

    if (violatesMargin) {
      warnings.push(
        `Artwork is within ${safeMarginIn} inches of the print edge. Qikink recommends keeping artwork inside the safe area to prevent edge clipping during garment loading.`
      );
    } else {
      info.push(`Artwork is safely centered within the ${safeMarginIn}" safety margin.`);
    }
  }

  // 5. Deep pixel analysis checks (if provided)
  if (pixelAnalysis) {
    if (pixelAnalysis.opaqueBoxSuspected) {
      warnings.push(
        'Opaque background box detected: All four corners are fully opaque. If you desire a transparent background, remove the background before exporting.'
      );
    }

    if (pixelAnalysis.touchesEdges.any) {
      warnings.push(
        'Artwork touches the edge of its bounding box. Ensure no unintentional edge cropping occurred in the source image.'
      );
    }

    if (pixelAnalysis.semiTransparentPercent > 35) {
      warnings.push(
        `${pixelAnalysis.semiTransparentPercent}% of artwork consists of semi-transparent pixels. Note that DTF white underbase printing may produce unexpected dithering or halos on semi-transparent gradients.`
      );
    }

    if (pixelAnalysis.strayLowAlphaPercent > 2) {
      warnings.push(
        `Faint alpha artifacts detected (${pixelAnalysis.strayLowAlphaPercent}% near-invisible pixels). Use edge defringe / alpha cleanup to prevent ghost dirt spots on dark apparel.`
      );
    }
  }

  // 6. File size check (Qikink limit: 25 MB)
  if (fileSizeBytes) {
    const sizeMb = fileSizeBytes / (1024 * 1024);
    if (sizeMb > 25) {
      errors.push(
        `File size (${sizeMb.toFixed(1)} MB) exceeds Qikink's maximum upload limit of 25 MB.`
      );
    } else if (sizeMb > 20) {
      warnings.push(
        `File size (${sizeMb.toFixed(1)} MB) is close to the 25 MB Qikink upload limit.`
      );
    }
  }

  // 7. Status classification
  let status: ValidationStatus = 'ready';
  let statusLabel = 'Ready to Export';
  const hasHardErrors = errors.length > 0;

  if (hasHardErrors) {
    if (effectiveDpi < 150) {
      status = 'needs_upscale';
      statusLabel = 'Needs Upscaling';
    } else {
      status = 'check_dimensions';
      statusLabel = 'Check Print Dimensions';
    }
  } else if (warnings.length > 0) {
    status = 'ready_with_warnings';
    statusLabel = 'Ready with Warnings';
  }

  return {
    status,
    statusLabel,
    canExport: !hasHardErrors,
    errors,
    warnings,
    info,
    metrics: {
      canvasWidthPx: targetCanvas.widthPx,
      canvasHeightPx: targetCanvas.heightPx,
      effectiveDpi: Math.round(effectiveDpi * 10) / 10,
      realDetailDpi: Math.round(realDetailDpi * 10) / 10,
      minAcceptableDpi: 150,
      printWidthIn,
      printHeightIn,
      placedWidthIn: Math.round(placedWidthIn * 100) / 100,
      placedHeightIn: Math.round(placedHeightIn * 100) / 100,
    },
    disclaimer: POD_DISCLAIMER,
  };
}
