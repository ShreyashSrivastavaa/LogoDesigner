import sharp from 'sharp';
import { UpscaleProvider, UpscaleOptions, UpscaleResult } from '../types.js';

export class LanczosUpscaleProvider implements UpscaleProvider {
  public readonly name = 'lanczos3-unsharp';
  public readonly kind = 'resampling' as const;

  public async isAvailable(): Promise<boolean> {
    return true; // Always available locally via sharp
  }

  public async upscale(
    imageBuffer: Buffer,
    scale: 2 | 4 | 8,
    options: UpscaleOptions = {}
  ): Promise<UpscaleResult> {
    const meta = await sharp(imageBuffer).metadata();
    const origW = meta.width || 1;
    const origH = meta.height || 1;

    const targetW = origW * scale;
    const targetH = origH * scale;

    // Memory guard: cap output dimensions at 500 Megapixels
    if (targetW * targetH > 500_000_000) {
      throw new Error(
        `Target upscale dimensions (${targetW}x${targetH} = ${(
          (targetW * targetH) /
          1_000_000
        ).toFixed(1)} MP) exceed memory safety limit.`
      );
    }

    let pipeline = sharp(imageBuffer, { limitInputPixels: 500_000_000 })
      .resize({
        width: targetW,
        height: targetH,
        kernel: 'lanczos3',
        fit: 'fill',
      })
      .ensureAlpha();

    // Mild unsharp mask to gently restore perceived edge contrast without haloing
    if (options.denoise !== false) {
      pipeline = pipeline.sharpen({
        sigma: 1.0,
        m1: 1.0,
        m2: 2.0,
        x1: 2.0,
        y2: 10.0,
        y3: 20.0,
      });
    }

    const outputBuffer = await pipeline
      .png({ palette: false, compressionLevel: 9 })
      .toBuffer();

    const outMeta = await sharp(outputBuffer).metadata();

    return {
      buffer: outputBuffer,
      width: outMeta.width || targetW,
      height: outMeta.height || targetH,
      scaleFactor: scale,
      kind: 'resampling',
      providerName: this.name,
      provenanceLabel: `Resampled (${scale}x Lanczos3 + Unsharp Mask - Not AI Detail)`,
    };
  }
}
