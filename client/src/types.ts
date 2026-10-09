export interface Layer {
  id: string;
  fileId: string;
  name: string;
  x: number; // in inches or pixels relative to canvas
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  originalWidth: number;
  originalHeight: number;
  hasAlpha: boolean;
  previewUrl: string;
}

export interface GarmentPlacement {
  id: string;
  name: string;
  printWidthIn: number;
  printHeightIn: number;
  safeMarginIn: number;
  minDpi: number;
  recommendedDpi: number;
  maxFileSizeMb: number;
  supportedFormats: ('PNG' | 'JPEG')[];
  provenance: {
    sourceUrl: string;
    retrievedAt: string;
    verified: boolean;
    notes: string;
  };
}

export interface GarmentColor {
  name: string;
  hex: string;
}

export interface ProductPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  garmentColors: GarmentColor[];
  placements: GarmentPlacement[];
}

export interface ProjectVersion {
  id: string;
  versionNumber: number;
  label: string;
  fileId: string;
  previewUrl: string;
  provenance: {
    type: 'original' | 'bg-removed' | 'upscaled' | 'resampled' | 'defringed' | 'edited';
    label: string;
    timestamp: string;
  };
  originalPixels: {
    width: number;
    height: number;
  };
  width: number;
  height: number;
  hasAlpha: boolean;
}

export interface ValidationReport {
  status: 'ready' | 'ready_with_warnings' | 'needs_upscale' | 'check_dimensions';
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

export interface VerificationReport {
  isValid: boolean;
  passedChecks: string[];
  errors: string[];
  warnings: string[];
  metrics: {
    widthPx: number;
    heightPx: number;
    channels: number;
    hasAlpha: boolean;
    densityDpi?: number;
    measuredPpmX?: number;
    measuredPpmY?: number;
    fileSizeBytes: number;
    fileSizeMb: number;
    cornerAlphas: [number, number, number, number];
    transparentPixelPercentage: number;
    isIhdrColorType6?: boolean;
  };
  auditTimestamp: string;
}

export type EditorTool = 'select' | 'move' | 'crop' | 'erase' | 'restore' | 'defringe' | 'hand';
