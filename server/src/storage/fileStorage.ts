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

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.resolve(process.cwd(), 'data', 'storage');
    this.metaFile = path.join(this.baseDir, 'storage-meta.json');
    this.ensureDirs();
    this.loadIndex();
  }

  private ensureDirs(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
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
    const list = Array.from(this.fileIndex.values());
    fs.writeFileSync(this.metaFile, JSON.stringify(list, null, 2), 'utf-8');
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

    // Save immutably (read-only attribute where possible)
    fs.writeFileSync(targetPath, buffer);

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
    this.persistIndex();
    return stored;
  }

  public async getFile(fileId: string): Promise<{ buffer: Buffer; meta: StoredFile }> {
    const meta = this.fileIndex.get(fileId);
    if (!meta) {
      throw new Error(`File ID not found in storage: ${fileId}`);
    }
    if (!fs.existsSync(meta.filePath)) {
      throw new Error(`Storage file missing on disk: ${meta.filePath}`);
    }
    const buffer = fs.readFileSync(meta.filePath);
    return { buffer, meta };
  }

  public getFilePath(fileId: string): string {
    const meta = this.fileIndex.get(fileId);
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
    this.persistIndex();
  }

  public async verifyIntegrity(fileId: string): Promise<boolean> {
    const { buffer, meta } = await this.getFile(fileId);
    const currentHash = crypto.createHash('sha256').update(buffer).digest('hex');
    return currentHash === meta.sha256;
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
