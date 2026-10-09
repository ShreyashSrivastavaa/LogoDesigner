/**
 * Export Renderer - Zenith District Print Studio
 * High-fidelity, print-ready image export pipeline using libvips (sharp).
 * Always renders from original source assets at true target resolution with Lanczos3 resampling.
 */

import sharp from 'sharp';
import { calculateTargetPixels, dpiToPixelsPerMeter } from './pixelMath.js';

export interface LayerRenderSpec {
  sourceBuffer: Buffer;
  x: number; // Top-left position on export canvas (px)
  y: number;
  width: number; // Placed width on export canvas (px)
  height: number; // Placed height on export canvas (px)
  rotationDeg?: number;
  opacity?: number; // 0 to 1
  colorOverlayHex?: string;
}

export interface ExportRenderRequest {
  printWidthIn: number;
  printHeightIn: number;
  dpi: number;
  format: 'PNG' | 'JPEG';
  layers: LayerRenderSpec[];
  jpegBackgroundHex?: string;
  trimTransparentEdges?: boolean;
}

export interface ExportRenderResult {
  buffer: Buffer;
  widthPx: number;
  heightPx: number;
  dpi: number;
  format: 'PNG' | 'JPEG';
  channels: number;
  byteSize: number;
  ppm: number;
}

/**
 * Parse hex color code into RGB components
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const sanitized = hex.replace('#', '').trim();
  if (sanitized.length !== 6 && sanitized.length !== 3) {
    return { r: 255, g: 255, b: 255 }; // Safe default
  }

  if (sanitized.length === 3) {
    const r = parseInt(sanitized[0] + sanitized[0], 16);
    const g = parseInt(sanitized[1] + sanitized[1], 16);
    const b = parseInt(sanitized[2] + sanitized[2], 16);
    return { r, g, b };
  }

  const r = parseInt(sanitized.substring(0, 2), 16);
  const g = parseInt(sanitized.substring(2, 4), 16);
  const b = parseInt(sanitized.substring(4, 6), 16);
  return { r, g, b };
}

/**
 * Render print-ready artwork from source assets
 */
export async function renderPrintArtwork(
  request: ExportRenderRequest
): Promise<ExportRenderResult> {
  const {
    printWidthIn,
    printHeightIn,
    dpi,
    format,
    layers,
    jpegBackgroundHex = '#FFFFFF',
    trimTransparentEdges = false,
  } = request;

  // 1. Calculate target canvas pixel dimensions
  const targetDims = calculateTargetPixels(printWidthIn, printHeightIn, dpi);
  const canvasWidth = targetDims.widthPx;
  const canvasHeight = targetDims.heightPx;
  const ppm = dpiToPixelsPerMeter(dpi);

  // Safeguard memory limits (up to 500 megapixels)
  const totalPixels = canvasWidth * canvasHeight;
  if (totalPixels > 500_000_000) {
    throw new Error(
      `Canvas pixel dimensions (${canvasWidth}x${canvasHeight} = ${totalPixels} px) exceed safe processing limits.`
    );
  }

  // 2. Prepare composite layers with high-fidelity Lanczos3 resampling
  const sharpComposites: sharp.OverlayOptions[] = [];

  for (const layer of layers) {
    const targetW = Math.max(1, Math.round(layer.width));
    const targetH = Math.max(1, Math.round(layer.height));

    let layerPipeline = sharp(layer.sourceBuffer, {
      limitInputPixels: 500_000_000,
    })
      .resize({
        width: targetW,
        height: targetH,
        kernel: 'lanczos3',
        fit: 'fill',
      })
      .ensureAlpha();

    // Apply rotation if specified
    if (layer.rotationDeg && layer.rotationDeg % 360 !== 0) {
      layerPipeline = layerPipeline.rotate(layer.rotationDeg, {
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
    }

    // Apply opacity modulation if < 1
    if (typeof layer.opacity === 'number' && layer.opacity < 1 && layer.opacity >= 0) {
      // Modulate alpha channel
      const { data, info } = await layerPipeline.raw().toBuffer({ resolveWithObject: true });
      const op = Math.max(0, Math.min(1, layer.opacity));
      for (let i = 3; i < data.length; i += 4) {
        data[i] = Math.round(data[i] * op);
      }
      layerPipeline = sharp(data, {
        raw: {
          width: info.width,
          height: info.height,
          channels: 4,
        },
      });
    }

    // Apply Photoshop-style color overlay if specified (recolors all non-transparent pixels, preserves alpha)
    if (layer.colorOverlayHex) {
      const { r, g, b } = hexToRgb(layer.colorOverlayHex);
      const { data, info } = await layerPipeline.raw().toBuffer({ resolveWithObject: true });
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) {
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
      }
      layerPipeline = sharp(data, {
        raw: {
          width: info.width,
          height: info.height,
          channels: 4,
        },
      });
    }

    const processedBuffer = await layerPipeline.png().toBuffer();
    sharpComposites.push({
      input: processedBuffer,
      left: Math.round(layer.x),
      top: Math.round(layer.y),
      blend: 'over',
    });
  }

  // 3. Create pristine root RGBA canvas
  let baseCanvas = sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
    limitInputPixels: 500_000_000,
  });

  if (sharpComposites.length > 0) {
    baseCanvas = baseCanvas.composite(sharpComposites);
  }

  // 4. Optional trim of transparent borders (per Qikink trimming recommendation)
  if (trimTransparentEdges && format === 'PNG') {
    baseCanvas = baseCanvas.trim();
  }

  // 5. Output encoding according to format
  let outputBuffer: Buffer;
  let finalChannels = 4;

  if (format === 'PNG') {
    outputBuffer = await baseCanvas
      .png({
        palette: false,
        compressionLevel: 9,
        adaptiveFiltering: true,
        force: true,
        dither: 0,
      })
      .withMetadata({ density: dpi })
      .toBuffer();
    finalChannels = 4;
  } else if (format === 'JPEG') {
    const bgRgb = hexToRgb(jpegBackgroundHex);
    outputBuffer = await baseCanvas
      .flatten({ background: bgRgb })
      .jpeg({
        quality: 95,
        chromaSubsampling: '4:4:4',
        force: true,
      })
      .withMetadata({ density: dpi })
      .toBuffer();
    finalChannels = 3;
  } else {
    throw new Error(`Unsupported export format: ${format}`);
  }

  // Read back actual output metadata
  const outputMeta = await sharp(outputBuffer).metadata();

  return {
    buffer: outputBuffer,
    widthPx: outputMeta.width || canvasWidth,
    heightPx: outputMeta.height || canvasHeight,
    dpi,
    format,
    channels: finalChannels,
    byteSize: outputBuffer.length,
    ppm,
  };
}
