# Known Limitations: Zenith District Print Studio

This document tracks known technical limitations, workarounds, and features planned for subsequent development phases.

---

## 1. Local AI Execution Limits
- **CPU vs GPU:** Local background removal (`rembg`) utilizes ONNX Runtime CPU execution on systems without DirectML/CUDA configured. Large images (>4000px) may take 5–15 seconds to process locally.
- **Tiled 8x Upscale Memory Cap:** 8x upscaling is restricted to images under 3000px input dimension to prevent memory exhaustion, with a fallback notice in the UI.

## 2. CMYK Color Handling
- **Color Space:** Export engine outputs strict sRGB PNG (Type 6, 8-bit RGBA) and JPEG. While Qikink printers use CMYK inks (often CMYK + White for DTF/DTG), modern POD RIP software natively accepts 300 DPI sRGB transparent PNGs. CMYK conversion guidance and out-of-gamut warnings are provided, but direct 4-channel CMYK PNGs are avoided as browsers and most POD web uploaders do not correctly parse CMYK PNG profiles.

## 3. Vectorization (SVG)
- **Vector conversion:** Rasters with complex gradients, drop shadows, or photographic elements will not vectorize accurately. SVG export is restricted to clear monochromatic or flat vector graphics, labeled with an approximation warning.

## 4. Phase-Specific Status
- Features are implemented strictly per the phased roadmap in Section 12. Unbuilt phase features are visibly tagged in the UI as "Not available yet".
