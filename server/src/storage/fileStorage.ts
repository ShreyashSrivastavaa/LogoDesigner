import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

export interface StoredFile {
  fileId: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  filePath: string;
  createdAt: string;
}

export type ProvenanceType =
  | 'original'
  | 'bg-removed'
  | 'upscaled'
  | 'resampled'
  | 'edited'
  | 'export';

export interface VersionProvenance {
  type: ProvenanceType;
  method?: string;
  scaleFactor?: number;
  parentVersionId?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface ProjectVersion {
  versionId: string;
  versionNumber: number;
  projectId: string;
  label: string;
  storedFileId: string;
  provenance: VersionProvenance;
  metadata: {
    width: number;
    height: number;
    channels: number;
    hasAlpha: boolean;
    format: string;
  };
  originalPixels: {
    width: number;
    height: number;
  };
  createdAt: string;
}

export interface StorageInterface {
  saveFile(buffer: Buffer, originalFilename: string, mimeType: string): Promise<StoredFile>;
  getFile(fileId: string): Promise<{ buffer: Buffer; meta: StoredFile }>;
  getFilePath(fileId: string): string;
  deleteFile(fileId: string): Promise<void>;
  verifyIntegrity(fileId: string): Promise<boolean>;
}

export class LocalDiskStorage implements StorageInterface {
  private readonly baseDir: string;
  private readonly metaFile: string;
  private fileIndex: Map<string, StoredFile> = new Map();
  private static memoryBufferCache = new Map<string, { buffer: Buffer; meta: StoredFile }>();

  constructor(baseDir?: string) {
    const isVercel = Boolean(process.env.VERCEL || process.env.NOW_REGION);
    const defaultDir = isVercel
      ? path.join('/tmp', 'zenith-storage')
      : path.resolve(process.cwd(), 'data', 'storage');

    this.baseDir = baseDir || process.env.STORAGE_DIR || defaultDir;
    this.metaFile = path.join(this.baseDir, 'storage-meta.json');
    this.ensureDirs();
    this.loadIndex();
  }

  private ensureDirs(): void {
    if (!fs.existsSync(this.baseDir)) {
      try {
        fs.mkdirSync(this.baseDir, { recursive: true });
      } catch (err) {
        console.warn('[Storage] ensureDirs error:', err);
      }
    }
  }

  private loadIndex(): void {
    if (fs.existsSync(this.metaFile)) {
      try {
        const raw = fs.readFileSync(this.metaFile, 'utf-8');
        const list: StoredFile[] = JSON.parse(raw);
        this.fileIndex = new Map(list.map((f) => [f.fileId, f]));
      } catch {
        this.fileIndex = new Map();
      }
    }
  }

  private persistIndex(): void {
    try {
      const list = Array.from(this.fileIndex.values());
      fs.writeFileSync(this.metaFile, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[Storage] persistIndex warning:', err);
    }
  }

  public async saveFile(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<StoredFile> {
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const ext = path.extname(originalFilename) || (mimeType.includes('jpeg') ? '.jpg' : '.png');
    const fileId = crypto.randomUUID();
    const diskFilename = `${fileId}${ext}`;
    const targetPath = path.join(this.baseDir, diskFilename);

    try {
      this.ensureDirs();
      fs.writeFileSync(targetPath, buffer);
    } catch (writeErr) {
      console.warn('[Storage] Write to disk warning (continuing with memory cache):', writeErr);
    }

    const stored: StoredFile = {
      fileId,
      filename: originalFilename,
      mimeType,
      byteSize: buffer.length,
      sha256: hash,
      filePath: targetPath,
      createdAt: new Date().toISOString(),
    };

    this.fileIndex.set(fileId, stored);
    LocalDiskStorage.memoryBufferCache.set(fileId, { buffer, meta: stored });
    this.persistIndex();
    return stored;
  }

  public async getFile(fileId: string): Promise<{ buffer: Buffer; meta: StoredFile }> {
    // 1. Check fileIndex
    let meta = this.fileIndex.get(fileId);
    if (!meta) {
      this.loadIndex();
      meta = this.fileIndex.get(fileId);
    }

    // 2. Dynamic disk fallback: check if file exists with pattern fileId.*
    if (!meta && fs.existsSync(this.baseDir)) {
      try {
        const files = fs.readdirSync(this.baseDir);
        const match = files.find((f) => f.startsWith(fileId));
        if (match) {
          const fullPath = path.join(this.baseDir, match);
          const ext = path.extname(match).toLowerCase();
          const mimeType =
            ext === '.png'
              ? 'image/png'
              : ext === '.jpg' || ext === '.jpeg'
              ? 'image/jpeg'
              : 'application/octet-stream';
          meta = {
            fileId,
            filename: match,
            mimeType,
            byteSize: fs.statSync(fullPath).size,
            sha256: '',
            filePath: fullPath,
            createdAt: new Date().toISOString(),
          };
          this.fileIndex.set(fileId, meta);
        }
      } catch (err) {
        console.warn('[Storage] Error scanning directory for file:', err);
      }
    }

    // 3. Read directly from disk if present
    if (meta && fs.existsSync(meta.filePath)) {
      try {
        const buffer = fs.readFileSync(meta.filePath);
        LocalDiskStorage.memoryBufferCache.set(fileId, { buffer, meta });
        return { buffer, meta };
      } catch (readErr) {
        console.warn('[Storage] Disk read error, falling back to memory cache:', readErr);
      }
    }

    // 4. Memory buffer cache fallback (for ephemeral container filesystems)
    const cached = LocalDiskStorage.memoryBufferCache.get(fileId);
    if (cached) {
      return cached;
    }

    if (!meta) {
      throw new Error(`File ID not found in storage: ${fileId}`);
    }

    throw new Error(`Storage file missing on disk: ${meta.filePath}`);
  }

  public getFilePath(fileId: string): string {
    let meta = this.fileIndex.get(fileId);
    if (!meta) {
      this.loadIndex();
      meta = this.fileIndex.get(fileId);
    }
    if (!meta) {
      throw new Error(`File ID not found in storage: ${fileId}`);
    }
    return meta.filePath;
  }

  public async deleteFile(fileId: string): Promise<void> {
    const meta = this.fileIndex.get(fileId);
    if (meta && fs.existsSync(meta.filePath)) {
      fs.unlinkSync(meta.filePath);
    }
    this.fileIndex.delete(fileId);
    LocalDiskStorage.memoryBufferCache.delete(fileId);
    this.persistIndex();
  }

  public async verifyIntegrity(fileId: string): Promise<boolean> {
    let meta = this.fileIndex.get(fileId);
    if (!meta) {
      this.loadIndex();
      meta = this.fileIndex.get(fileId);
    }
    if (meta && fs.existsSync(meta.filePath)) {
      const diskBuffer = fs.readFileSync(meta.filePath);
      const currentHash = crypto.createHash('sha256').update(diskBuffer).digest('hex');
      return currentHash === meta.sha256;
    }
    const { buffer, meta: m } = await this.getFile(fileId);
    const currentHash = crypto.createHash('sha256').update(buffer).digest('hex');
    return currentHash === m.sha256;
  }
}

/**
 * Inspect image metadata using sharp
 */
export async function inspectImageBuffer(buffer: Buffer): Promise<{
  width: number;
  height: number;
  channels: number;
  hasAlpha: boolean;
  format: string;
}> {
  const meta = await sharp(buffer).metadata();
  return {
    width: meta.width || 0,
    height: meta.height || 0,
    channels: meta.channels || 3,
    hasAlpha: meta.hasAlpha || false,
    format: meta.format || 'unknown',
  };
}
