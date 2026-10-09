import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { LocalDiskStorage, inspectImageBuffer } from './storage/fileStorage.js';
import { PresetsCatalogSchema } from './presets/presetSchema.js';
import { validatePrintProject, analyzeImageBuffer } from './core/validator.js';
import { renderPrintArtwork } from './core/exportRenderer.js';
import { verifyExportedFile } from './core/postExportVerifier.js';
import { LocalRembgProvider } from './providers/bgRemoval/localRembgProvider.js';
import { LanczosUpscaleProvider } from './providers/upscale/lanczosUpscaleProvider.js';
import { StandaloneGraphicGenerationProvider } from './providers/generation/imageGenerationProvider.js';
import { processAlphaDefringe } from './core/alphaProcessing.js';
import { detectArtworkType } from './core/graphicColorKey.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Storage & Providers
const storage = new LocalDiskStorage();
const rembgProvider = new LocalRembgProvider();
const upscaleProvider = new LanczosUpscaleProvider();
const generationProvider = new StandaloneGraphicGenerationProvider();

// Load Qikink Presets
const presetsPath = path.resolve(process.cwd(), 'src', 'presets', 'qikink.json');
let presetsCatalog: unknown = null;
if (fs.existsSync(presetsPath)) {
  const raw = fs.readFileSync(presetsPath, 'utf-8');
  presetsCatalog = PresetsCatalogSchema.parse(JSON.parse(raw));
}

// Multer memory storage for uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 35 * 1024 * 1024, // 35 MB upload cap
  },
});

/**
 * Sniff file magic bytes to verify PNG/JPEG/WebP
 */
function verifyMagicBytes(buffer: Buffer): { isValid: boolean; detectedMime: string } {
  if (buffer.length < 8) return { isValid: false, detectedMime: 'unknown' };

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { isValid: true, detectedMime: 'image/png' };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, detectedMime: 'image/jpeg' };
  }

  // WebP: RIFF .... WEBP
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { isValid: true, detectedMime: 'image/webp' };
  }

  return { isValid: false, detectedMime: 'unknown' };
}

// --- API Endpoints ---

// 1. Health check
app.get('/api/health', async (_req, res) => {
  res.json({
    status: 'ok',
    app: 'Zenith Lab Server',
    version: '1.0.0',
    capabilities: {
      localRembg: await rembgProvider.isAvailable(),
      lanczosUpscale: true,
      aiGenerator: await generationProvider.isAvailable(),
    },
  });
});

// 2. Presets catalog
app.get('/api/presets', (_req, res) => {
  res.json(presetsCatalog);
});

// 3. Upload Artwork
app.post('/api/upload', upload.single('file'), async (req, res): Promise<void> => {
  try {
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const buffer = req.file.buffer;
    const { isValid, detectedMime } = verifyMagicBytes(buffer);
    if (!isValid) {
      res.status(400).json({
        error:
          'Security check failed: File bytes do not match supported image types (PNG, JPEG, WebP).',
      });
      return;
    }

    // Save immutably
    const stored = await storage.saveFile(buffer, req.file.originalname, detectedMime);

    // Deep inspect metadata and pixel characteristics
    const meta = await inspectImageBuffer(buffer);
    const pixelAnalysis = await analyzeImageBuffer(buffer);

    res.json({
      fileId: stored.fileId,
      filename: stored.filename,
      mimeType: stored.mimeType,
      byteSize: stored.byteSize,
      sha256: stored.sha256,
      metadata: meta,
      pixelAnalysis,
      url: `/api/files/${stored.fileId}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload processing failed';
    res.status(500).json({ error: message });
  }
});

// 4. Validate Print Project
app.post('/api/validate', (req, res): void => {
  try {
    const result = validatePrintProject(req.body);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Validation failed';
    res.status(400).json({ error: message });
  }
});

// 5. High-Resolution Print Export
app.post('/api/export', async (req, res): Promise<void> => {
  try {
    const {
      printWidthIn,
      printHeightIn,
      dpi = 300,
      format = 'PNG',
      layers,
      jpegBackgroundHex = '#FFFFFF',
      trimTransparentEdges = false,
      filename = 'zenith-district-print-artwork',
    } = req.body;

    if (!layers || !Array.isArray(layers) || layers.length === 0) {
      res.status(400).json({ error: 'At least one artwork layer is required for export.' });
      return;
    }

    // Hydrate source buffers from storage
    const renderedLayers = [];
    for (const l of layers) {
      const { buffer } = await storage.getFile(l.fileId);
      renderedLayers.push({
        sourceBuffer: buffer,
        x: l.x,
        y: l.y,
        width: l.width,
        height: l.height,
        rotationDeg: l.rotationDeg || 0,
        opacity: typeof l.opacity === 'number' ? l.opacity : 1.0,
      });
    }

    // Render export with Lanczos3 resampling and strict channel control
    const exportResult = await renderPrintArtwork({
      printWidthIn,
      printHeightIn,
      dpi,
      format,
      layers: renderedLayers,
      jpegBackgroundHex,
      trimTransparentEdges,
    });

    // Run deep post-export verification
    const verificationReport = await verifyExportedFile(exportResult.buffer, {
      expectedWidthPx: exportResult.widthPx,
      expectedHeightPx: exportResult.heightPx,
      expectedDpi: dpi,
      format,
      expectAlpha: format === 'PNG',
      maxFileSizeMb: 25.0,
    });

    if (!verificationReport.isValid) {
      res.status(422).json({
        error: 'Export failed post-production verification checks.',
        verificationReport,
      });
      return;
    }

    // Save exported file immutably
    const ext = format === 'PNG' ? '.png' : '.jpg';
    const outFilename = `${filename}-${exportResult.widthPx}x${exportResult.heightPx}${ext}`;
    const stored = await storage.saveFile(
      exportResult.buffer,
      outFilename,
      format === 'PNG' ? 'image/png' : 'image/jpeg'
    );

    res.json({
      success: true,
      fileId: stored.fileId,
      filename: stored.filename,
      downloadUrl: `/api/download/${stored.fileId}`,
      previewUrl: `/api/files/${stored.fileId}`,
      metrics: {
        widthPx: exportResult.widthPx,
        heightPx: exportResult.heightPx,
        dpi,
        format,
        fileSizeMb: verificationReport.metrics.fileSizeMb,
        channels: exportResult.channels,
      },
      verificationReport,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Export rendering failed';
    res.status(500).json({ error: message });
  }
});

// 6. Background Removal (Graphic Color-Key / Photo AI)
app.post('/api/detect-bg-mode', async (req, res): Promise<void> => {
  try {
    const { fileId } = req.body;
    if (!fileId) {
      res.status(400).json({ error: 'fileId is required' });
      return;
    }
    const { buffer } = await storage.getFile(fileId);
    const detection = await detectArtworkType(buffer);
    res.json(detection);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Artwork classification failed';
    res.status(500).json({ error: message });
  }
});

app.post('/api/remove-bg', async (req, res): Promise<void> => {
  try {
    const {
      fileId,
      model = 'u2net',
      alphaMatting = false,
      mode = 'auto',
      preserveFineDetail = true,
      tolerance,
    } = req.body;

    if (!fileId) {
      res.status(400).json({ error: 'fileId is required' });
      return;
    }

    const { buffer, meta } = await storage.getFile(fileId);
    const bgResult = await rembgProvider.removeBackground(buffer, {
      model,
      alphaMatting,
      mode,
      preserveFineDetail,
      tolerance: tolerance !== undefined ? Number(tolerance) : undefined,
    });

    const newFilename = `${path.parse(meta.filename).name}-bg-removed.png`;
    const stored = await storage.saveFile(bgResult.buffer, newFilename, 'image/png');
    const pixelAnalysis = await analyzeImageBuffer(bgResult.buffer);

    res.json({
      fileId: stored.fileId,
      filename: stored.filename,
      width: bgResult.width,
      height: bgResult.height,
      channels: bgResult.channels,
      detectedMode: bgResult.detectedMode,
      effectiveMode: bgResult.effectiveMode,
      estimatedBgHex: bgResult.estimatedBgHex,
      restoredPixelsCount: bgResult.restoredPixelsCount,
      pixelAnalysis,
      url: `/api/files/${stored.fileId}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Background removal failed';
    res.status(500).json({ error: message });
  }
});

// 7. Upscale Artwork (2x, 4x, 8x Lanczos3 / AI)
app.post('/api/upscale', async (req, res): Promise<void> => {
  try {
    const { fileId, scale = 2, denoise = true } = req.body;
    if (!fileId) {
      res.status(400).json({ error: 'fileId is required' });
      return;
    }

    const validScale = Number(scale) as 2 | 4 | 8;
    if (![2, 4, 8].includes(validScale)) {
      res.status(400).json({ error: 'Scale factor must be 2, 4, or 8' });
      return;
    }

    const { buffer, meta } = await storage.getFile(fileId);
    const upscaleResult = await upscaleProvider.upscale(buffer, validScale, { denoise });

    const newFilename = `${path.parse(meta.filename).name}-${validScale}x-upscaled.png`;
    const stored = await storage.saveFile(upscaleResult.buffer, newFilename, 'image/png');
    const pixelAnalysis = await analyzeImageBuffer(upscaleResult.buffer);

    res.json({
      fileId: stored.fileId,
      filename: stored.filename,
      width: upscaleResult.width,
      height: upscaleResult.height,
      scaleFactor: upscaleResult.scaleFactor,
      kind: upscaleResult.kind,
      provenanceLabel: upscaleResult.provenanceLabel,
      pixelAnalysis,
      url: `/api/files/${stored.fileId}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upscaling failed';
    res.status(500).json({ error: message });
  }
});

// 8. Alpha Defringe & Edge Refine
app.post('/api/defringe', async (req, res): Promise<void> => {
  try {
    const { fileId, cutoffThreshold, chokePx, decontaminateColor } = req.body;
    if (!fileId) {
      res.status(400).json({ error: 'fileId is required' });
      return;
    }

    const { buffer, meta } = await storage.getFile(fileId);
    const refinedBuffer = await processAlphaDefringe(buffer, {
      cutoffThreshold,
      chokePx,
      decontaminateColor,
    });

    const newFilename = `${path.parse(meta.filename).name}-defringed.png`;
    const stored = await storage.saveFile(refinedBuffer, newFilename, 'image/png');
    const pixelAnalysis = await analyzeImageBuffer(refinedBuffer);

    res.json({
      fileId: stored.fileId,
      filename: stored.filename,
      pixelAnalysis,
      url: `/api/files/${stored.fileId}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Edge defringe failed';
    res.status(500).json({ error: message });
  }
});

// 9. AI Generation
app.post('/api/generate', async (req, res): Promise<void> => {
  try {
    const {
      prompt,
      style = 'streetwear',
      composition = 'centered_emblem',
      palettePreset,
      count = 2,
    } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    const candidates = await generationProvider.generate({
      prompt,
      style,
      composition,
      palettePreset,
      count,
    });

    const savedCandidates = [];
    for (const c of candidates) {
      const stored = await storage.saveFile(
        c.buffer,
        `zenith-generated-${style}.png`,
        'image/png'
      );
      savedCandidates.push({
        id: c.id,
        fileId: stored.fileId,
        width: c.width,
        height: c.height,
        provider: c.provider,
        costEstimateUsd: c.costEstimateUsd,
        url: `/api/files/${stored.fileId}`,
      });
    }

    res.json({ candidates: savedCandidates });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    res.status(500).json({ error: message });
  }
});

// 10. Serve file
app.get('/api/files/:fileId', async (req, res): Promise<void> => {
  try {
    const { buffer, meta } = await storage.getFile(req.params.fileId);
    res.setHeader('Content-Type', meta.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch {
    res.status(404).json({ error: 'File not found' });
  }
});

// 11. Download file
app.get('/api/download/:fileId', async (req, res): Promise<void> => {
  try {
    const { buffer, meta } = await storage.getFile(req.params.fileId);
    res.setHeader('Content-Type', meta.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${meta.filename}"`);
    res.send(buffer);
  } catch {
    res.status(404).json({ error: 'File not found' });
  }
});

// Serve built frontend assets if present
const clientDistPath = path.resolve(process.cwd(), '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Zenith Lab Server] Listening on http://localhost:${PORT}`);
  });
}

export default app;
