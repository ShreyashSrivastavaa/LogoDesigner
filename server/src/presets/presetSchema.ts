import { z } from 'zod';

export const ProvenanceSchema = z.object({
  sourceUrl: z.string().url(),
  retrievedAt: z.string(),
  verified: z.boolean(),
  notes: z.string(),
});

export const PrintPlacementSchema = z.object({
  id: z.string(),
  name: z.string(),
  printWidthIn: z.number().positive(),
  printHeightIn: z.number().positive(),
  safeMarginIn: z.number().nonnegative().default(0.5),
  minDpi: z.number().positive().default(150),
  recommendedDpi: z.number().positive().default(300),
  maxFileSizeMb: z.number().positive().default(25),
  supportedFormats: z.array(z.enum(['PNG', 'JPEG'])).default(['PNG', 'JPEG']),
  provenance: ProvenanceSchema,
});

export const GarmentColorSchema = z.object({
  name: z.string(),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const ProductPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['t-shirt', 'oversized-t-shirt', 'hoodie', 'sweatshirt', 'custom']),
  description: z.string(),
  garmentColors: z.array(GarmentColorSchema),
  placements: z.array(PrintPlacementSchema),
  notes: z.string().optional(),
});

export const PresetsCatalogSchema = z.object({
  version: z.string(),
  updatedAt: z.string(),
  products: z.array(ProductPresetSchema),
});

export type Provenance = z.infer<typeof ProvenanceSchema>;
export type PrintPlacement = z.infer<typeof PrintPlacementSchema>;
export type GarmentColor = z.infer<typeof GarmentColorSchema>;
export type ProductPreset = z.infer<typeof ProductPresetSchema>;
export type PresetsCatalog = z.infer<typeof PresetsCatalogSchema>;
