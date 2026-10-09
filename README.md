# Zenith District Print Studio

> **Production-grade print-on-demand artwork engineering studio for Qikink apparel fulfillment.**
> Generates, cleans, upscales, and exports apparel artwork as **correctly sized, high-resolution, genuinely transparent PNG files (Color Type 6, 300 DPI)**.

---

## 1. Product Overview

Zenith District Print Studio solves the critical failure points of apparel print production:
- **Zero Fake Transparency:** Generates genuine 8-bit RGBA PNG files (PNG Color Type 6) with no baked white boxes or checkerboards.
- **Physical Print Math & pHYs Density:** Pre-computes exact pixel dimensions from garment print areas in inches (`pxW = round(widthIn * DPI)`), setting the PNG `pHYs` density chunk (11,811 ppm for 300 DPI).
- **Edge Defringing & Alpha Cleanup:** Chokes semi-transparent borders and removes near-invisible ghost alpha pixels that create white underbase halos on dark fabric.
- **Post-Export Binary Auditing:** Re-reads exported files from disk, scanning raw binary chunks to verify dimensions, channels, density, and transparent corners before offering download.
- **Verified Qikink Apparel Presets:** Backed by official Qikink DTF/DTG documentation with explicit provenance tracking (`sourceUrl`, `verified: true|false`).
- **Free Local Mode:** 100% functional offline without paid third-party APIs using local Python `rembg` (u2net/BiRefNet) and Lanczos3 resampling with unsharp masking.

---

## 2. Verified Qikink Apparel Presets

| Garment Model | Placement | Print Size (Inches) | Target Pixels @ 300 DPI | Provenance Status |
| :--- | :--- | :--- | :--- | :--- |
| **Unisex Classic Tee** | Front - Maximum Area | **16.0 × 20.0 in** | **4800 × 6000 px** | Verified Qikink DTF |
| **Unisex Classic Tee** | Front - Standard Chest | **12.0 × 16.0 in** | **3600 × 4800 px** | Verified Qikink Standard |
| **Oversized Streetwear Tee** | Front - Max Canvas | **16.0 × 20.0 in** | **4800 × 6000 px** | Verified Qikink DTF |
| **Oversized Streetwear Tee** | Back - Statement Poster | **16.0 × 20.0 in** | **4800 × 6000 px** | Verified Qikink DTF |
| **Oversized Streetwear Tee** | Front - Center Emblem | **10.0 × 10.0 in** | **3000 × 3000 px** | Verified Qikink Standard |
| **Streetwear Hoodie** | Front - Above Kangaroo Pocket | **10.0 × 10.0 in** (Max) | **3000 × 3000 px** | Verified Qikink (pocket clearance) |
| **Streetwear Hoodie** | Back - Maximum Print | **14.0 × 18.0 in** | **4200 × 5400 px** | Verified Qikink DTF |
| **Sleeve / Pocket** | Left / Right Pocket & Sleeve | **4.0 × 4.0 in** | **1200 × 1200 px** | Verified Qikink DTF |

*All presets are declared in `server/src/presets/qikink.json` conforming to Zod validation in `server/src/presets/presetSchema.ts`.*

---

## 3. Prerequisites

- **Node.js:** v20.x or v24.x LTS (tested on Node v24.18.0)
- **npm:** v10+ or v11+
- **Python (Optional for Local AI BG Removal):** Python 3.10+ with `rembg`, `onnxruntime`, `Pillow` (already pre-installed on this host)

---

## 4. Quick Start & Running Locally

### 1. Install Dependencies
```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
cd ..
```

### 2. Run in Development Mode
```bash
# Terminal 1: Start Backend Server (port 4000)
cd server && npm run dev

# Terminal 2: Start Vite Frontend (port 3000)
cd client && npm run dev
```
Open **`http://localhost:3000`** in your browser. (API requests are automatically proxied to `:4000`).

### 3. Build & Run Single-Port Production Mode
```bash
# Build frontend
cd client && npm run build

# Build backend
cd ../server && npm run build

# Start production server
node dist/server.js
```
Open **`http://localhost:4000`** in your browser.

---

## 5. Automated Verification & Test Suite

The project includes an automated test suite verifying all requirements of Section 8:
- **Pixel Math:** Dimension conversions, DPI thresholds, rounding.
- **Validator Engine:** Clipping detection, safe area margins, low-DPI blocking.
- **Export Renderer:** Lanczos3 resampling, layer compositing, JPEG flattening.
- **Export Integrity:** PNG IHDR Color Type 6, pHYs chunk density (11,811 ppm), corner alpha preservation, 6000×8000 px export memory test.
- **Storage:** SHA-256 hash immutability and tamper detection.
- **Full E2E Studio Journey:** AI generation -> validation -> defringing -> upscaling -> 300 DPI export -> post-export binary audit.

```bash
# Run full verification suite
npm run verify
```

---

## 6. Environment Variables (`.env`)

Copy `.env.example` to `.env`:

```env
PORT=4000
NODE_ENV=production

# Optional Paid Cloud Provider Keys (Leave blank for Free Local Mode)
OPENAI_API_KEY=
REPLICATE_API_TOKEN=
FAL_KEY=

STORAGE_DIR=./data/storage
```

---

## 7. Docker Deployment

Run the complete studio with volume persistence:

```bash
docker compose up --build -d
```
Access the application at `http://localhost:4000`.

---

## 8. Documentation References

- [DECISIONS.md](file:///d:/LogoDesigner/DECISIONS.md): Architectural decisions and trade-offs log.
- [KNOWN_LIMITATIONS.md](file:///d:/LogoDesigner/KNOWN_LIMITATIONS.md): Documented technical constraints.
- [docs/PROVIDERS.md](file:///d:/LogoDesigner/docs/PROVIDERS.md): Provider cost, quality, and license benchmark.
- [docs/MANUAL_QA.md](file:///d:/LogoDesigner/docs/MANUAL_QA.md): External viewer and Qikink dashboard manual checklist.
