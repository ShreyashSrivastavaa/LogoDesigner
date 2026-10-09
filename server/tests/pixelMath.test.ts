import { describe, it, expect } from 'vitest';
import {
  cmToInches,
  inchesToCm,
  calculateTargetPixels,
  calculateEffectiveDpi,
  calculateRealDetailDpi,
  dpiToPixelsPerMeter,
  pixelsPerMeterToDpi,
  getDpiRating,
} from '../src/core/pixelMath.js';

describe('Pixel Math Core Module', () => {
  it('converts centimeters to inches correctly', () => {
    expect(cmToInches(2.54)).toBeCloseTo(1.0, 5);
    expect(cmToInches(25.4)).toBeCloseTo(10.0, 5);
    expect(cmToInches(30.48)).toBeCloseTo(12.0, 5);
    expect(() => cmToInches(0)).toThrow();
    expect(() => cmToInches(-5)).toThrow();
  });

  it('converts inches to centimeters correctly', () => {
    expect(inchesToCm(1.0)).toBeCloseTo(2.54, 5);
    expect(inchesToCm(12.0)).toBeCloseTo(30.48, 5);
    expect(inchesToCm(16.0)).toBeCloseTo(40.64, 5);
    expect(() => inchesToCm(0)).toThrow();
    expect(() => inchesToCm(-1)).toThrow();
  });

  it('computes exact target canvas dimensions (12x16 @ 300 = 3600x4800)', () => {
    const res = calculateTargetPixels(12, 16, 300);
    expect(res.widthPx).toBe(3600);
    expect(res.heightPx).toBe(4800);
  });

  it('computes exact target canvas dimensions (10x10 @ 150 = 1500x1500)', () => {
    const res = calculateTargetPixels(10, 10, 150);
    expect(res.widthPx).toBe(1500);
    expect(res.heightPx).toBe(1500);
  });

  it('handles fractional inches with correct rounding', () => {
    // 8.27 in x 11.69 in (A4) @ 300 DPI
    const res = calculateTargetPixels(8.27, 11.69, 300);
    expect(res.widthPx).toBe(Math.round(8.27 * 300)); // 2481
    expect(res.heightPx).toBe(Math.round(11.69 * 300)); // 3507
  });

  it('throws on invalid or negative dimensions/DPI', () => {
    expect(() => calculateTargetPixels(-10, 12, 300)).toThrow();
    expect(() => calculateTargetPixels(10, 0, 300)).toThrow();
    expect(() => calculateTargetPixels(10, 12, -300)).toThrow();
    expect(() => calculateTargetPixels(NaN, 12, 300)).toThrow();
  });

  it('calculates effective DPI accurately and reports the lower axis', () => {
    // 2400x3000 placed on 8x12 inches:
    // dpiX = 2400 / 8 = 300
    // dpiY = 3000 / 12 = 250
    // Lower axis is 250
    const res = calculateEffectiveDpi(2400, 3000, 8, 12);
    expect(res.dpiX).toBe(300);
    expect(res.dpiY).toBe(250);
    expect(res.effectiveDpi).toBe(250);
  });

  it('calculates real-detail DPI using original source pixels before upscale', () => {
    // Original: 600x600 px. Placed on 4x4 inches.
    // realDetailDPI = 600 / 4 = 150.
    const res = calculateRealDetailDpi(600, 600, 4, 4);
    expect(res.realDetailDpi).toBe(150);
  });

  it('converts DPI to PNG pHYs pixels per meter (round(dpi / 0.0254))', () => {
    expect(dpiToPixelsPerMeter(300)).toBe(11811);
    expect(dpiToPixelsPerMeter(150)).toBe(5906);
    expect(pixelsPerMeterToDpi(11811)).toBe(300);
    expect(pixelsPerMeterToDpi(5906)).toBe(150);
  });

  it('correctly maps DPI ratings to print quality thresholds', () => {
    expect(getDpiRating(300).rating).toBe('excellent');
    expect(getDpiRating(300).needsUpscale).toBe(false);

    expect(getDpiRating(240).rating).toBe('good');
    expect(getDpiRating(240).needsUpscale).toBe(false);

    expect(getDpiRating(160).rating).toBe('acceptable');
    expect(getDpiRating(160).needsUpscale).toBe(false);

    expect(getDpiRating(140).rating).toBe('poor');
    expect(getDpiRating(140).needsUpscale).toBe(true);
  });
});
