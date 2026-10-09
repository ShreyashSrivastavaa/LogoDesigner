import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PresetsCatalogSchema } from '../src/presets/presetSchema.js';

describe('Qikink Presets Schema & Data Integrity', () => {
  const presetPath = path.resolve(process.cwd(), 'src', 'presets', 'qikink.json');

  it('qikink.json exists and strictly validates against PresetsCatalogSchema', () => {
    expect(fs.existsSync(presetPath)).toBe(true);
    const raw = fs.readFileSync(presetPath, 'utf-8');
    const json = JSON.parse(raw);

    const parsed = PresetsCatalogSchema.safeParse(json);
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      console.error(parsed.error);
    }
  });

  it('contains essential streetwear garments with verified placements', () => {
    const raw = fs.readFileSync(presetPath, 'utf-8');
    const catalog = PresetsCatalogSchema.parse(JSON.parse(raw));

    const unisexTee = catalog.products.find((p) => p.id === 'unisex-classic-tee');
    expect(unisexTee).toBeDefined();

    const hoodie = catalog.products.find((p) => p.id === 'hoodie-pullover');
    expect(hoodie).toBeDefined();

    // Verify hoodie front has max 10x10 inches to clear kangaroo pocket
    const hoodieFront = hoodie?.placements.find((pl) => pl.id === 'hoodie-front-chest');
    expect(hoodieFront).toBeDefined();
    expect(hoodieFront?.printWidthIn).toBe(10.0);
    expect(hoodieFront?.printHeightIn).toBe(10.0);
    expect(hoodieFront?.provenance.verified).toBe(true);
  });

  it('marks custom placements with verified: false', () => {
    const raw = fs.readFileSync(presetPath, 'utf-8');
    const catalog = PresetsCatalogSchema.parse(JSON.parse(raw));

    const custom = catalog.products.find((p) => p.id === 'custom-preset');
    expect(custom).toBeDefined();
    const customPl = custom?.placements[0];
    expect(customPl?.provenance.verified).toBe(false);
  });
});
