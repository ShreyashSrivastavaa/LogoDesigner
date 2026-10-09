import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';

async function processBrandAssets() {
  const rootDir = path.resolve('..');
  const brandDir = path.join(rootDir, 'client', 'public', 'brand');
  if (!fs.existsSync(brandDir)) fs.mkdirSync(brandDir, { recursive: true });

  const sheetPath = path.join(rootDir, '4b8991fb-02b5-4364-b57e-e99ba9d79263.png');
  console.log('Processing sheet:', sheetPath);

  // 1. Precise App Icon (top right squircle)
  const appIconBuffer = await sharp(sheetPath)
    .extract({ left: 1276, top: 52, width: 200, height: 200 })
    .png()
    .toBuffer();

  await sharp(appIconBuffer).toFile(path.join(brandDir, 'zenith_lab_app_icon.png'));

  // Also write client/public/favicon.png and client/public/favicon-32x32.png
  await sharp(appIconBuffer)
    .resize(64, 64)
    .toFile(path.join(rootDir, 'client', 'public', 'favicon.png'));

  await sharp(appIconBuffer)
    .resize(32, 32)
    .toFile(path.join(rootDir, 'client', 'public', 'favicon-32x32.png'));

  // 2. Horizontal Logo on transparent background
  const horizCrop = await sharp(sheetPath)
    .extract({ left: 640, top: 78, width: 576, height: 122 })
    .png()
    .toBuffer();

  await sharp(horizCrop).toFile(path.join(brandDir, 'zenith_lab_horizontal_dark.png'));

  // 3. Make transparent version of Horizontal Logo:
  const { data, info } = await sharp(horizCrop).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const transparentHorizBuf = Buffer.alloc(info.width * info.height * 4);
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    const maxVal = Math.max(r, g, b);
    
    if (maxVal <= 6) {
      transparentHorizBuf[i] = 0;
      transparentHorizBuf[i+1] = 0;
      transparentHorizBuf[i+2] = 0;
      transparentHorizBuf[i+3] = 0;
    } else if (maxVal < 40) {
      const alpha = Math.round(((maxVal - 6) / 34) * 200);
      transparentHorizBuf[i] = r;
      transparentHorizBuf[i+1] = g;
      transparentHorizBuf[i+2] = b;
      transparentHorizBuf[i+3] = alpha;
    } else {
      transparentHorizBuf[i] = r;
      transparentHorizBuf[i+1] = g;
      transparentHorizBuf[i+2] = b;
      transparentHorizBuf[i+3] = 255;
    }
  }

  await sharp(transparentHorizBuf, {
    raw: { width: info.width, height: info.height, channels: 4 }
  }).png().toFile(path.join(brandDir, 'zenith_lab_horizontal_transparent.png'));

  // 4. Transparent version of the Mark alone:
  const markCrop = await sharp(sheetPath)
    .extract({ left: 195, top: 28, width: 180, height: 145 })
    .png()
    .toBuffer();

  const markRaw = await sharp(markCrop).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const transparentMarkBuf = Buffer.alloc(markRaw.info.width * markRaw.info.height * 4);
  for (let i = 0; i < markRaw.data.length; i += 4) {
    const r = markRaw.data[i];
    const g = markRaw.data[i+1];
    const b = markRaw.data[i+2];
    const maxVal = Math.max(r, g, b);
    if (maxVal <= 6) {
      transparentMarkBuf[i] = 0;
      transparentMarkBuf[i+1] = 0;
      transparentMarkBuf[i+2] = 0;
      transparentMarkBuf[i+3] = 0;
    } else if (maxVal < 40) {
      const alpha = Math.round(((maxVal - 6) / 34) * 200);
      transparentMarkBuf[i] = r;
      transparentMarkBuf[i+1] = g;
      transparentMarkBuf[i+2] = b;
      transparentMarkBuf[i+3] = alpha;
    } else {
      transparentMarkBuf[i] = r;
      transparentMarkBuf[i+1] = g;
      transparentMarkBuf[i+2] = b;
      transparentMarkBuf[i+3] = 255;
    }
  }

  await sharp(transparentMarkBuf, {
    raw: { width: markRaw.info.width, height: markRaw.info.height, channels: 4 }
  }).png().toFile(path.join(brandDir, 'zenith_lab_mark_transparent.png'));

  console.log('Brand assets extracted successfully to:', brandDir);
}

processBrandAssets().catch(err => {
  console.error('Extraction failed:', err);
  process.exit(1);
});
