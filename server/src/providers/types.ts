/**
 * Provider Types - Zenith District Print Studio
 * Standardized interfaces for Image Generation, Background Removal, and Upscaling.
 */

export interface GenerationParams {
  prompt: string;
  style: 'streetwear' | 'typography' | 'vintage' | 'minimal' | 'anime' | 'custom';
  composition: 'centered_emblem' | 'full_chest' | 'stacked' | 'badge';
  palettePreset?: string;
  count?: number;
  transparentBackgroundPreferred?: boolean;
}

export interface GeneratedCandidate {
  id: string;
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  hasAlpha: boolean;
  provider: string;
  costEstimateUsd?: number;
}

export interface ImageGenerationProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generate(params: GenerationParams): Promise<GeneratedCandidate[]>;
}

export interface BackgroundRemovalOptions {
  model?: string;
  alphaMatting?: boolean;
  mode?: 'auto' | 'graphic' | 'photo';
  preserveFineDetail?: boolean;
  tolerance?: number;
  customBgRgb?: [number, number, number];
  detailMode?: 'graphic' | 'hair_detail';
  edgeMode?: 'crisp_screenprint' | 'smooth_antialiased';
}

export interface BackgroundRemovalResult {
  buffer: Buffer;
  width: number;
  height: number;
  channels: number;
  providerName: string;
  isLocal: boolean;
  detectedMode?: 'graphic' | 'photo';
  effectiveMode?: 'graphic' | 'photo';
  estimatedBgHex?: string;
  restoredPixelsCount?: number;
}

export interface BackgroundRemovalProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  removeBackground(imageBuffer: Buffer, options?: BackgroundRemovalOptions): Promise<BackgroundRemovalResult>;
}

export interface UpscaleOptions {
  model?: string;
  denoise?: boolean;
  preserveText?: boolean;
}

export interface UpscaleResult {
  buffer: Buffer;
  width: number;
  height: number;
  scaleFactor: number;
  kind: 'ai' | 'resampling';
  providerName: string;
  provenanceLabel: string;
}

export interface UpscaleProvider {
  name: string;
  kind: 'ai' | 'resampling';
  isAvailable(): Promise<boolean>;
  upscale(imageBuffer: Buffer, scale: 2 | 4 | 8, options?: UpscaleOptions): Promise<UpscaleResult>;
}
