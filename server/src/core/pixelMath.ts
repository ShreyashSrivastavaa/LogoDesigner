/**
 * Pixel Math Module - Zenith District Print Studio
 * Single source of truth for all print dimension and DPI calculations.
 */

export interface DimensionInches {
  widthIn: number;
  heightIn: number;
}

export interface DimensionCm {
  widthCm: number;
  heightCm: number;
}

export interface DimensionPixels {
  widthPx: number;
  heightPx: number;
}

export type DpiRating = 'excellent' | 'good' | 'acceptable' | 'poor';

export interface DpiQualityAssessment {
  rating: DpiRating;
  label: string;
  isAcceptable: boolean;
  needsUpscale: boolean;
  message: string;
}

/**
 * Convert centimeters to inches (exact 1 in = 2.54 cm standard)
 */
export function cmToInches(cm: number): number {
  if (cm <= 0 || !Number.isFinite(cm)) {
    throw new Error(`Invalid centimeter dimension: ${cm}`);
  }
  return cm / 2.54;
}

/**
 * Convert inches to centimeters
 */
export function inchesToCm(inches: number): number {
  if (inches <= 0 || !Number.isFinite(inches)) {
    throw new Error(`Invalid inch dimension: ${inches}`);
  }
  return inches * 2.54;
}

/**
 * Calculate required output pixel dimensions from physical print size and target DPI.
 * Formula: pxW = round(widthIn * dpi), pxH = round(heightIn * dpi)
 */
export function calculateTargetPixels(
  widthIn: number,
  heightIn: number,
  dpi: number = 300
): DimensionPixels {
  if (widthIn <= 0 || heightIn <= 0 || dpi <= 0) {
    throw new Error(
      `Invalid print dimensions or DPI: width=${widthIn}, height=${heightIn}, dpi=${dpi}`
    );
  }
  if (!Number.isFinite(widthIn) || !Number.isFinite(heightIn) || !Number.isFinite(dpi)) {
    throw new Error('Dimensions and DPI must be finite numbers');
  }

  return {
    widthPx: Math.round(widthIn * dpi),
    heightPx: Math.round(heightIn * dpi),
  };
}

/**
 * Calculate effective DPI of placed artwork on both axes, returning the lower axis.
 * Accounts for artwork's placed scale within the physical print area.
 * Formula: effectiveDPI = sourcePixels / printInches
 */
export function calculateEffectiveDpi(
  sourcePixelsW: number,
  sourcePixelsH: number,
  placedWidthIn: number,
  placedHeightIn: number
): { dpiX: number; dpiY: number; effectiveDpi: number } {
  if (sourcePixelsW <= 0 || sourcePixelsH <= 0 || placedWidthIn <= 0 || placedHeightIn <= 0) {
    throw new Error('Source pixels and placed dimensions in inches must be greater than zero');
  }

  const dpiX = sourcePixelsW / placedWidthIn;
  const dpiY = sourcePixelsH / placedHeightIn;
  const effectiveDpi = Math.min(dpiX, dpiY);

  return {
    dpiX: Math.round(dpiX * 10) / 10,
    dpiY: Math.round(dpiY * 10) / 10,
    effectiveDpi: Math.round(effectiveDpi * 10) / 10,
  };
}

/**
 * Calculate real-detail DPI using original source pixels before any upscaling.
 * An image upscaled 4x from 600px has 2400px but still carries ~600px of real detail.
 */
export function calculateRealDetailDpi(
  originalPixelsW: number,
  originalPixelsH: number,
  placedWidthIn: number,
  placedHeightIn: number
): { realDetailDpiX: number; realDetailDpiY: number; realDetailDpi: number } {
  if (originalPixelsW <= 0 || originalPixelsH <= 0 || placedWidthIn <= 0 || placedHeightIn <= 0) {
    throw new Error('Original pixels and placed dimensions in inches must be greater than zero');
  }

  const dpiX = originalPixelsW / placedWidthIn;
  const dpiY = originalPixelsH / placedHeightIn;
  const realDetailDpi = Math.min(dpiX, dpiY);

  return {
    realDetailDpiX: Math.round(dpiX * 10) / 10,
    realDetailDpiY: Math.round(dpiY * 10) / 10,
    realDetailDpi: Math.round(realDetailDpi * 10) / 10,
  };
}

/**
 * Convert DPI to PNG pHYs chunk density (pixels per meter).
 * 1 inch = 0.0254 meters.
 * Formula: round(dpi / 0.0254)
 */
export function dpiToPixelsPerMeter(dpi: number): number {
  if (dpi <= 0 || !Number.isFinite(dpi)) {
    throw new Error(`Invalid DPI: ${dpi}`);
  }
  return Math.round(dpi / 0.0254);
}

/**
 * Convert pixels per meter back to DPI (for post-export verification)
 * Formula: round(ppm * 0.0254)
 */
export function pixelsPerMeterToDpi(ppm: number): number {
  if (ppm <= 0 || !Number.isFinite(ppm)) {
    throw new Error(`Invalid pixels per meter: ${ppm}`);
  }
  return Math.round(ppm * 0.0254);
}

/**
 * Evaluate DPI rating against industry POD standards (Qikink verified rules):
 * >= 300: Excellent (Standard commercial print grade)
 * >= 200: Good (Acceptable for most DTG/DTF apparel)
 * >= 150: Acceptable with warning (Qikink minimum threshold)
 * < 150: Poor / Needs Upscaling
 */
export function getDpiRating(effectiveDpi: number): DpiQualityAssessment {
  if (effectiveDpi >= 300) {
    return {
      rating: 'excellent',
      label: 'Excellent (300+ DPI)',
      isAcceptable: true,
      needsUpscale: false,
      message: 'Meets full commercial print specification (300 DPI).',
    };
  }
  if (effectiveDpi >= 200) {
    return {
      rating: 'good',
      label: 'Good (200-299 DPI)',
      isAcceptable: true,
      needsUpscale: false,
      message: 'Sufficient for direct-to-garment printing; crisp edges expected.',
    };
  }
  if (effectiveDpi >= 150) {
    return {
      rating: 'acceptable',
      label: 'Acceptable (150-199 DPI)',
      isAcceptable: true,
      needsUpscale: false,
      message: 'Meets minimum Qikink print threshold. Upscaling recommended for fine text/lines.',
    };
  }
  return {
    rating: 'poor',
    label: 'Needs Upscaling (<150 DPI)',
    isAcceptable: false,
    needsUpscale: true,
    message: 'Below Qikink 150 DPI threshold. Artwork will print blurry or pixelated without upscaling.',
  };
}
