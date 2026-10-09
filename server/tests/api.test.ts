import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { generateAllFixtures, GeneratedFixtures } from './fixtures/generateFixtures.js';
import app from '../src/server.js';
import { Server } from 'node:http';

describe('API Server Integration Tests', () => {
  let server: Server;
  let baseUrl: string;
  let fixtures: GeneratedFixtures;

  beforeAll(async () => {
    fixtures = await generateAllFixtures();
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

  it('GET /api/health returns system status and capabilities', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.capabilities).toBeDefined();
    expect(data.capabilities.lanczosUpscale).toBe(true);
  });

  it('GET /api/presets returns verified Qikink products and placements', async () => {
    const res = await fetch(`${baseUrl}/api/presets`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.products).toBeInstanceOf(Array);
    expect(data.products.length).toBeGreaterThanOrEqual(4);
  });

  it('POST /api/upload accepts valid image and returns fileId and analysis', async () => {
    const fileBuf = fs.readFileSync(fixtures.transparentGradientPath);
    const formData = new FormData();
    const blob = new Blob([fileBuf], { type: 'image/png' });
    formData.append('file', blob, 'transparent-gradient.png');

    const res = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.fileId).toBeDefined();
    expect(data.metadata.width).toBe(400);
    expect(data.metadata.height).toBe(400);
    expect(data.metadata.hasAlpha).toBe(true);
    expect(data.pixelAnalysis).toBeDefined();
  });

  it('POST /api/export executes end-to-end rendering and post-export verification', async () => {
    // 1. Upload fixture
    const fileBuf = fs.readFileSync(fixtures.transparentGradientPath);
    const formData = new FormData();
    formData.append('file', new Blob([fileBuf], { type: 'image/png' }), 'test-art.png');
    const upRes = await fetch(`${baseUrl}/api/upload`, { method: 'POST', body: formData });
    const upData = await upRes.json();

    // 2. Export 10x10 inches @ 150 DPI
    const expRes = await fetch(`${baseUrl}/api/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printWidthIn: 10,
        printHeightIn: 10,
        dpi: 150,
        format: 'PNG',
        layers: [
          {
            fileId: upData.fileId,
            x: 250,
            y: 250,
            width: 1000,
            height: 1000,
          },
        ],
      }),
    });

    expect(expRes.ok).toBe(true);
    const expData = await expRes.json();
    expect(expData.success).toBe(true);
    expect(expData.downloadUrl).toBeDefined();
    expect(expData.metrics.widthPx).toBe(1500);
    expect(expData.metrics.heightPx).toBe(1500);
    expect(expData.verificationReport.isValid).toBe(true);
  });
});
