import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/server.js';
import { Server } from 'node:http';
import fs from 'node:fs';

describe('Zenith District Studio Complete End-to-End User Journey', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (typeof address === 'object' && address) {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });
  }, 30000);

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('completes the full studio lifecycle: AI Generate -> Validate -> Remove BG -> Defringe -> Upscale -> Export -> Post-Export Audit', async () => {
    // 1. Fetch Presets & Verify Qikink Provenance
    const presetsRes = await fetch(`${baseUrl}/api/presets`);
    expect(presetsRes.ok).toBe(true);
    const presets = await presetsRes.json();
    const oversizedTee = presets.products.find((p: any) => p.id === 'oversized-tee');
    expect(oversizedTee).toBeDefined();
    const frontPlacement = oversizedTee.placements[0];
    expect(frontPlacement.printWidthIn).toBe(16.0);
    expect(frontPlacement.printHeightIn).toBe(20.0);
    expect(frontPlacement.provenance.verified).toBe(true);

    // 2. Generate Standalone Streetwear Graphic Candidate
    const genRes = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'CYBERPUNK SAMURAI EMBLEM',
        style: 'streetwear',
        composition: 'centered_emblem',
        count: 2,
      }),
    });
    expect(genRes.ok).toBe(true);
    const genData = await genRes.json();
    expect(genData.candidates.length).toBeGreaterThanOrEqual(1);
    const candidate = genData.candidates[0];
    expect(candidate.fileId).toBeDefined();

    // 3. Validate Candidate Placement at 300 DPI
    // 16x20 inches @ 300 DPI = 4800x6000 px canvas
    const valRes = await fetch(`${baseUrl}/api/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printWidthIn: 16.0,
        printHeightIn: 20.0,
        dpi: 300,
        exportFormat: 'PNG',
        safeMarginIn: 0.5,
        artwork: {
          sourceWidthPx: candidate.width,
          sourceHeightPx: candidate.height,
          originalWidthPx: candidate.width,
          originalHeightPx: candidate.height,
          placedX: 600,
          placedY: 900,
          placedWidthPx: 3600,
          placedHeightPx: 4200,
          hasAlpha: true,
        },
      }),
    });
    expect(valRes.ok).toBe(true);
    const valData = await valRes.json();
    expect(valData.status).toBeDefined();
    expect(valData.metrics.canvasWidthPx).toBe(4800);
    expect(valData.metrics.canvasHeightPx).toBe(6000);

    // 4. Run Defringe & Alpha Cleanup on Candidate
    const defringeRes = await fetch(`${baseUrl}/api/defringe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId: candidate.fileId,
        cutoffThreshold: 15,
        chokePx: 1,
      }),
    });
    expect(defringeRes.ok).toBe(true);
    const defringeData = await defringeRes.json();
    expect(defringeData.fileId).toBeDefined();

    // 5. Upscale Artwork 2x with Lanczos3 Resampling
    const upscaleRes = await fetch(`${baseUrl}/api/upscale`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId: defringeData.fileId,
        scale: 2,
      }),
    });
    expect(upscaleRes.ok).toBe(true);
    const upscaleData = await upscaleRes.json();
    expect(upscaleData.width).toBe(candidate.width * 2);
    expect(upscaleData.height).toBe(candidate.height * 2);
    expect(upscaleData.kind).toBe('resampling');
    expect(upscaleData.provenanceLabel).toContain('Lanczos3');

    // 6. Final Production Export (16x20 inches @ 300 DPI = 4800x6000 pixels)
    const exportRes = await fetch(`${baseUrl}/api/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printWidthIn: 16.0,
        printHeightIn: 20.0,
        dpi: 300,
        format: 'PNG',
        layers: [
          {
            fileId: upscaleData.fileId,
            x: 600,
            y: 900,
            width: 3600,
            height: 4200,
            rotationDeg: 0,
            opacity: 1.0,
          },
        ],
        trimTransparentEdges: false,
        filename: 'zenith-oversized-samurai',
      }),
    });

    expect(exportRes.ok).toBe(true);
    const exportData = await exportRes.json();
    expect(exportData.success).toBe(true);
    expect(exportData.downloadUrl).toBeDefined();

    // Verify Post-Export Audit Report
    const report = exportData.verificationReport;
    expect(report.isValid).toBe(true);
    expect(report.metrics.widthPx).toBe(4800);
    expect(report.metrics.heightPx).toBe(6000);
    expect(report.metrics.channels).toBe(4);
    expect(report.metrics.hasAlpha).toBe(true);
    expect(report.metrics.isIhdrColorType6).toBe(true);
    expect(report.metrics.measuredPpmX).toBe(11811);
    expect(report.metrics.cornerAlphas).toEqual([0, 0, 0, 0]);

    // 7. Test Direct Binary Download of Exported Artwork
    const dlRes = await fetch(`${baseUrl}${exportData.downloadUrl}`);
    expect(dlRes.ok).toBe(true);
    expect(dlRes.headers.get('content-type')).toBe('image/png');
    const dlBuf = Buffer.from(await dlRes.arrayBuffer());
    expect(dlBuf.length).toBeGreaterThan(1000);
    expect(dlBuf.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }, 60000);
});
