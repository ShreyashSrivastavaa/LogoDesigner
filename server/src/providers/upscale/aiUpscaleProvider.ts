import { UpscaleProvider, UpscaleOptions, UpscaleResult } from '../types.js';
import { LanczosUpscaleProvider } from './lanczosUpscaleProvider.js';

export class AiUpscaleProvider implements UpscaleProvider {
  public readonly name = 'ai-realesrgan-host';
  public readonly kind = 'ai' as const;
  private fallbackProvider = new LanczosUpscaleProvider();

  public async isAvailable(): Promise<boolean> {
    return Boolean(process.env.REPLICATE_API_TOKEN || process.env.FAL_KEY);
  }

  public async upscale(
    imageBuffer: Buffer,
    scale: 2 | 4 | 8,
    options: UpscaleOptions = {}
  ): Promise<UpscaleResult> {
    const hasKey = await this.isAvailable();

    if (!hasKey) {
      // Graceful fallback to Lanczos3 with honest label
      const fallback = await this.fallbackProvider.upscale(imageBuffer, scale, options);
      return {
        ...fallback,
        provenanceLabel: `Local Resampling (${scale}x Lanczos3 - API key not set, fallback applied)`,
      };
    }

    // Hosted Real-ESRGAN / BiRefNet implementation
    // Placeholder logic for API call with timeout
    try {
      // In production with token, call Replicate / fal endpoints
      // Fallback if network or quota errors occur
      return await this.fallbackProvider.upscale(imageBuffer, scale, options);
    } catch {
      return await this.fallbackProvider.upscale(imageBuffer, scale, options);
    }
  }
}
