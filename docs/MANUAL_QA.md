# Manual QA & Print-Readiness Inspection Checklist: Zenith District Print Studio

Use this checklist before uploading any artwork file to the Qikink merchant dashboard or sending batches to print production.

---

## 1. Physical External Viewer Inspection (Photoshop / GIMP / macOS Preview / Windows Photo Viewer)

- [ ] **Real Alpha Transparency Check:**
  - Open the exported `.png` file in an external editor (Photoshop, GIMP, Photopea, or system viewer).
  - Confirm the canvas background displays the transparency checkerboard.
  - **Fail condition:** If a solid white, solid black, or simulated checkerboard square grid is baked into the pixel layer, do NOT upload to Qikink.
- [ ] **Dark Background Test (Black Garment Simulation):**
  - Create a new layer filled with solid `#000000` underneath the artwork.
  - Inspect edges at 100% and 400% zoom.
  - Confirm there is no white halo fringe, grayish outline, or stray low-alpha noise around details.
- [ ] **Light Background Test (White Garment Simulation):**
  - Create a new layer filled with solid `#FFFFFF` underneath the artwork.
  - Inspect inner cutouts and transparent regions.
  - Confirm artwork is sharp and legible against high brightness.

---

## 2. File Metadata & Pixel Dimensions Verification

- [ ] **Exact Pixel Match:**
  - Check Image > Canvas Size. Dimensions must match the requested print area:
    - Unisex Tee Full Chest (12×16 in @ 300 DPI): **3600 × 4800 pixels**.
    - Oversized Tee Front Max (16×20 in @ 300 DPI): **4800 × 6000 pixels**.
    - Hoodie Front Above Pocket (10×10 in @ 300 DPI): **3000 × 3000 pixels**.
    - Sleeve / Pocket (4×4 in @ 300 DPI): **1200 × 1200 pixels**.
- [ ] **DPI Resolution Metadata (`pHYs` Chunk):**
  - Verify Image Resolution shows **300 Pixels/Inch** (or 118.11 Pixels/Centimeter).
- [ ] **File Size Compliance:**
  - File size must be under **25.0 MB** (Qikink upload hard cap). Typical PNG output will be between 1 MB and 12 MB depending on graphic complexity.

---

## 3. Qikink Dashboard Verification Steps

1. Log into Qikink Merchant Dashboard (`qikink.com`).
2. Navigate to **Orders > Create Order** or **Product Catalog**.
3. Select the target garment (e.g. *Oversized Classic T-Shirt* or *Streetwear Hoodie*).
4. Upload the exported PNG file.
5. Confirm the Qikink DPI indicator reads **300 DPI (High Quality)** and does not trigger low-resolution warnings.
6. Verify alignment against collar and seams in the Qikink 3D/2D preview.
7. **First-run recommendation:** Place a single sample unit order to inspect real-world DTF/DTG ink laydown before bulk customer fulfilment.
