import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { LocalDiskStorage } from '../src/storage/fileStorage.js';

describe('Storage & Immutable Originals Test Suite', () => {
  const testStorageDir = path.resolve(process.cwd(), 'data', 'test-storage');
  let storage: LocalDiskStorage;

  beforeEach(() => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
    storage = new LocalDiskStorage(testStorageDir);
  });

  afterEach(() => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  it('saves files immutably with sha256 hash tracking', async () => {
    const rawData = Buffer.from('TEST_IMAGE_BINARY_DATA_ZENITH_PRINT_STUDIO');
    const expectedHash = crypto.createHash('sha256').update(rawData).digest('hex');

    const stored = await storage.saveFile(rawData, 'sample-artwork.png', 'image/png');

    expect(stored.fileId).toBeDefined();
    expect(stored.sha256).toBe(expectedHash);
    expect(stored.byteSize).toBe(rawData.length);
    expect(fs.existsSync(stored.filePath)).toBe(true);

    // Retrieve file and verify content
    const retrieved = await storage.getFile(stored.fileId);
    expect(retrieved.buffer.toString()).toBe('TEST_IMAGE_BINARY_DATA_ZENITH_PRINT_STUDIO');
    expect(retrieved.meta.sha256).toBe(expectedHash);

    // Verify integrity function
    const isIntact = await storage.verifyIntegrity(stored.fileId);
    expect(isIntact).toBe(true);
  });

  it('detects tampering or corruption via SHA-256 integrity check', async () => {
    const rawData = Buffer.from('ORIGINAL_IMMUTABLE_ASSET');
    const stored = await storage.saveFile(rawData, 'original.png', 'image/png');

    // Simulate illicit file alteration on disk
    fs.writeFileSync(stored.filePath, Buffer.from('TAMPERED_ASSET'));

    const isIntact = await storage.verifyIntegrity(stored.fileId);
    expect(isIntact).toBe(false);
  });
});
