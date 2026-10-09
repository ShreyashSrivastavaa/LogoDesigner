/**
 * Photoshop-Style Color Overlay Utility
 * Recolors non-transparent pixels with a target solid color
 * while preserving exact alpha transparency and anti-aliased edge values.
 */

export interface ColorPreset {
  name: string;
  hex: string;
  isDark?: boolean;
}

export const RECOLOR_PALETTE: ColorPreset[] = [
  { name: 'Pure Black', hex: '#000000', isDark: true },
  { name: 'Pure White', hex: '#FFFFFF', isDark: false },
  { name: 'Canva Violet', hex: '#8B3DFF', isDark: true },
  { name: 'Cyber Cyan', hex: '#00C4CC', isDark: false },
  { name: 'Crimson Red', hex: '#FF3D4D', isDark: true },
  { name: 'Vibrant Gold', hex: '#FFD700', isDark: false },
  { name: 'Emerald Green', hex: '#00B100', isDark: true },
  { name: 'Solar Orange', hex: '#FF6105', isDark: false },
  { name: 'Royal Blue', hex: '#1E40AF', isDark: true },
  { name: 'Slate Smoke', hex: '#575A5F', isDark: true },
];

/**
 * Perform client-side 0ms instant color overlay via HTML5 Canvas
 */
export async function recolorImageDataUrl(
  dataUrlOrUrl: string,
  colorHex: string
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrlOrUrl);
          return;
        }

        // 1. Draw source image onto canvas
        ctx.drawImage(img, 0, 0);

        // 2. Photoshop Color Overlay mode:
        // 'source-in' retains the existing alpha mask while replacing all RGB with the fill color
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = colorHex;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('Canvas recolor error:', err);
        resolve(dataUrlOrUrl);
      }
    };

    img.onerror = () => {
      resolve(dataUrlOrUrl);
    };

    img.src = dataUrlOrUrl;
  });
}
