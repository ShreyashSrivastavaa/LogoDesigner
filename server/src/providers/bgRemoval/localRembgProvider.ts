import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {
  BackgroundRemovalProvider,
  BackgroundRemovalOptions,
  BackgroundRemovalResult,
} from '../types.js';
import {
  detectArtworkType,
  removeGraphicBackground,
} from '../../core/graphicColorKey.js';
import { applyPhotoDetailSafetyNet } from '../../core/photoSafetyNet.js';

export class LocalRembgProvider implements BackgroundRemovalProvider {
  public readonly name = 'local-rembg-onnx';
  private pythonScriptPath: string;

  constructor() {
    const inSrc = path.resolve(process.cwd(), 'src', 'scripts', 'rembg_bridge.py');
    const inDist = path.resolve(process.cwd(), 'dist', 'scripts', 'rembg_bridge.py');
    this.pythonScriptPath = fs.existsSync(inSrc) ? inSrc : inDist;
  }

  public async isAvailable(): Promise<boolean> {
    return fs.existsSync(this.pythonScriptPath);
  }

  public async removeBackground(
    imageBuffer: Buffer,
    options: BackgroundRemovalOptions = {}
  ): Promise<BackgroundRemovalResult> {
    // 1. Automatic Artwork Classification (Graphic vs Photo)
    const detection = await detectArtworkType(imageBuffer);
    const detectedMode = detection.mode;
    const requestedMode = options.mode || 'auto';
    const effectiveMode = requestedMode === 'auto' ? detectedMode : requestedMode;

    // 2. Branch: Graphic / Flat Art Mode (Deterministic Color-Key, Zero AI Downsampling)
    if (effectiveMode === 'graphic') {
      const graphicResult = await removeGraphicBackground(imageBuffer, {
        tolerance: options.tolerance ?? 14,
        customBgRgb: options.customBgRgb,
        edgeMode: options.edgeMode,
      });

      return {
        buffer: graphicResult.buffer,
        width: graphicResult.width,
        height: graphicResult.height,
        channels: graphicResult.channels,
        providerName: 'zenith-graphic-colorkey',
        isLocal: true,
        detectedMode,
        effectiveMode: 'graphic',
        estimatedBgHex: graphicResult.estimatedBgHex,
      };
    }

    // 3. Branch: Photo Mode (Salient Object AI Model with Fine Detail Safety Net)
    const tempDir = os.tmpdir();
    const tempId = crypto.randomUUID();
    const inputPath = path.join(tempDir, `zenith-bg-in-${tempId}.png`);
    const outputPath = path.join(tempDir, `zenith-bg-out-${tempId}.png`);

    try {
      // Write input to temp
      fs.writeFileSync(inputPath, imageBuffer);

      const args = [
        this.pythonScriptPath,
        '--input',
        inputPath,
        '--output',
        outputPath,
        '--model',
        options.model || 'u2net',
      ];

      if (options.alphaMatting === true) {
        args.push('--alpha-matting');
      }

      await new Promise<void>((resolve, reject) => {
        const child = spawn('python', args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stderr = '';

        child.stderr.on('data', (d) => {
          stderr += d.toString();
        });

        child.on('close', (code) => {
          if (code === 0 && fs.existsSync(outputPath)) {
            resolve();
          } else {
            reject(new Error(`rembg process exited with code ${code}: ${stderr}`));
          }
        });

        child.on('error', (err) => {
          reject(err);
        });
      });

      const rawAiBuffer = fs.readFileSync(outputPath);

      // Apply Photo Mode Safety Net (unless explicitly turned off)
      if (options.preserveFineDetail !== false) {
        const safetyResult = await applyPhotoDetailSafetyNet(imageBuffer, rawAiBuffer, {
          detailTolerance: options.tolerance ?? 18,
        });

        return {
          buffer: safetyResult.buffer,
          width: safetyResult.width,
          height: safetyResult.height,
          channels: 4,
          providerName: `${this.name}-safetynet`,
          isLocal: true,
          detectedMode,
          effectiveMode: 'photo',
          estimatedBgHex: detection.estimatedBgHex,
          restoredPixelsCount: safetyResult.restoredPixelsCount,
        };
      }

      const meta = await sharp(rawAiBuffer).metadata();
      return {
        buffer: rawAiBuffer,
        width: meta.width || 0,
        height: meta.height || 0,
        channels: meta.channels || 4,
        providerName: this.name,
        isLocal: true,
        detectedMode,
        effectiveMode: 'photo',
        estimatedBgHex: detection.estimatedBgHex,
      };
    } finally {
      // Clean up temp files
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
  }
}

