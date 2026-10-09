# Architectural & Technical Decisions Log: Zenith District Print Studio

This document records key engineering, design, and product decisions made during development, detailing rationale, alternatives considered, and trade-offs.

---

## 1. Project Initialization & Architecture Layout
- **Date:** 2026-10-09
- **Decision:** Full-stack TypeScript application with an Express backend (`server/`) and React 18 + Vite frontend (`client/`), unified in a single monorepo root.
- **Context & Problem:** The print studio requires heavy, memory-efficient image processing (compositing, pixel math, high-DPI metadata, edge defringing) that cannot rely on browser memory alone for 6000x8000+ print-ready files, while demanding a smooth, 60fps dark-mode streetwear studio UI.
- **Rationale:** Separating concerns into a dedicated backend (`sharp` on libvips) guarantees that browser canvas limitations (canvas size caps, WebGL context loss, memory pressure on mobile/tablets) never compromise output quality. The frontend handles interactive positioning, while the backend re-renders directly from source assets.
- **Trade-offs:** Requires running both client and server processes in dev mode (managed via root concurrent dev scripts).

---

## 2. Server Image Processing Core: sharp (libvips)
- **Date:** 2026-10-09
- **Decision:** Use `sharp` for all server-side rendering, format conversion, pHYs chunk manipulation, and post-export integrity audits.
- **Alternatives Considered:** Canvas (node-canvas), ImageMagick (CLI), Jimp.
- **Rationale:** `sharp` is 4x-8x faster than ImageMagick, handles streaming without buffering entire uncompressed bitmaps into V8 heap, natively supports Lanczos3 resampling, preserves 8-bit and 16-bit RGBA channels without color quantization, and supports reading/writing PNG density metadata (`pHYs`).
- **Trade-offs:** Native binaries are platform-dependent, but sharp prebuilds are rock-solid on Node 24 on win32-x64 and Linux.

---

## 3. Metadata & Job Persistence
- **Date:** 2026-10-09
- **Decision:** File-backed SQLite / transactional JSON metadata store for projects, immutable version trees, and background job queue.
- **Rationale:** Ensures zero external database dependencies (like PostgreSQL/Redis) while providing immediate local persistence, crash resilience, and easy migration to S3/R2 storage adapters later.
- **Trade-offs:** In-process job queue suits single-instance deployment; production multi-node scaling would require external Redis/bullmq (documented in deployment guide).

---

## 4. Qikink Preset Data Separation
- **Date:** 2026-10-09
- **Decision:** Presets reside in `presets/qikink.json` conforming to a strict Zod schema with explicit provenance fields (`sourceUrl`, `retrievedAt`, `verified: boolean`, `notes`).
- **Rationale:** Shipping apparel dimension updates must never require code redeployments. Official dimensions verified from Qikink DTF/DTG documentation:
  - T-Shirts (Unisex & Oversized): Max 16x20 inches (Standard Full Chest: 12x16 in).
  - Hoodies (Front): Max 10x10 inches (due to front pouch pocket).
  - Hoodies (Back): Max 14x18 / 16x20 inches.
  - Sleeve / Pocket: Max 4x4 inches.
  - Recommended DPI: 300 (150 minimum accepted).
  - Maximum upload size: 25 MB.
- **Trade-offs:** Unverified edge cases (e.g. specialized toddler sizes) are explicitly flagged with `verified: false` in the UI to prevent costly misprints.

---

## 5. Local Background Removal & Free Mode Fallback
- **Date:** 2026-10-09
- **Decision:** Bridge to local Python `rembg` (2.0.78 with onnxruntime) already verified in host environment for high-quality local background removal, coupled with server-side Lanczos3 resampling labeled honestly as "Resampling (not AI enhancement)".
- **Rationale:** Delivers 100% free, private, offline background removal and upscaling without third-party API keys or subscription dependencies.
- **Trade-offs:** Local model inference on CPU takes 2-6 seconds per 2000px image, handled via async job status reporting to keep UI responsive.

---

## 6. PNG Color Type 6 (Truecolor RGBA) Guarantees
- **Date:** 2026-10-09
- **Decision:** Enforce `palette: false` in Sharp PNG serialization to strictly forbid automatic color indexing to Color Type 3.
- **Rationale:** Libvips / libpng automatically quantizes images with fewer than 256 colors into an indexed palette PNG (Type 3). While visually similar on screen, POD RIP software and DTF white underbase generators often fail to parse indexed alpha transparency correctly, causing halo artifacts or solid underbase flood fills. Strict Type 6 (8-bit per channel RGBA) guarantees clean separation.
- **Trade-offs:** File sizes for flat/low-color artwork are slightly larger (unquantized), but well within Qikink's 25 MB limit.

---

## 7. Post-Export Binary Inspection & Verification
- **Date:** 2026-10-09
- **Decision:** The export endpoint does not merely stream rendered bytes; it re-reads the output buffer, scans PNG binary chunks for `pHYs` density and `IHDR` color type, evaluates alpha boundary corners, and validates dimensions.
- **Rationale:** Guarantees that no corrupted, misaligned, or un-density-tagged file reaches the client undetected. If any check fails, the API reports a 422 with a structured post-production audit failure.

---

## 8. Neural Soft Mask vs. PyMatting Closed-Form Memory Crash
- **Date:** 2026-10-09
- **Decision:** Default `rembg` background removal to `alpha_matting=False` with neural soft mask, backed by libvips/Sharp morphological defringing (`processAlphaDefringe`).
- **Context & Problem:** PyMatting's `alpha_matting=True` constructs a large sparse Laplacian matrix requiring 1.86+ GiB of contiguous RAM in `ichol.py` (`numpy._core._exceptions._ArrayMemoryError`), crashing inference on standard user hardware.
- **Rationale:** The underlying u2net/BiRefNet ONNX neural network natively outputs 216+ unique continuous alpha gradient levels across edge boundaries without requiring PyMatting's CPU-intensive Laplacian solver. Pairing the neural soft mask with our lightweight libvips defringe engine eliminates the out-of-memory crash, reduces inference time from >10s to ~2s, and preserves crisp, anti-aliased edges.
- **Trade-offs:** Closed-form matting is preserved as an optional opt-in flag with automatic fallback, but disabled by default for guaranteed stability.

---

## 9. Graphic / Flat Art Colour-Key Mode & Photo Safety Net
- **Date:** 2026-10-09
- **Decision:** Implemented a dual-pipeline background removal system:
  1. **Graphic / Flat Art Mode (Deterministic Color-Key):** Automatically selected when an image has a near-uniform perimeter border (stdDev < 16) and palette concentration (>85% pixels in <=4 clusters). Computes continuous sub-pixel alpha directly from distance to background at full native resolution with Sharp, decontaminates edge pixels to pure ink color, and snaps thresholds.
  2. **Photo Mode with Safety Net:** Preserves the salient-object neural network (`u2net`) for complex organic subjects, but UNIONS the mask with all high-contrast foreground detail pixels inside the subject bounding box (`preserveFineDetail=true` by default).
- **Problem & Root Cause:** Salient-object neural networks (U-2-Net, BiRefNet) downsample images to 320x320 or 512x512 feature maps and are trained on macroscopic real-world objects. When processing flat graphics, line art, and screen prints (e.g., black spider emblem with interior lettering on a #F0F0F0 background), the AI model misclassifies fine lettering, enclosed voids, and delicate strokes as background, deleting nearly 10% (5,674 pixels) of the graphic.
- **Rationale:** Graphic mode is 100% deterministic, executes in <150 ms at full source resolution (never on a downscaled proxy), preserves 100.0% of dark ink and fine letters, and eliminates light gray edge halos on black garments via decontaminated un-premultiplied color solving ($C = \alpha F + (1-\alpha)B$).
- **Verification:** Tested with synthetic fixtures and the real spider test graphic (`ffbb3645-a446-4256-83fa-9b762bfc885f.jpg`), achieving 100% ink survival, zero white/gray edge halos on `#000000` black background, and verified PNG Color Type 6 output.



