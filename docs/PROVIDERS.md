# Provider Analysis & Benchmark Guide: Zenith District Print Studio

This document evaluates candidate providers across Image Generation, Background Removal, and Upscaling specifically for print-on-demand (POD) apparel resale through Qikink.

---

## 1. Provider Comparison Matrix

| Capability | Provider / Model | Price per Run / MP | Max Resolution | Alpha Support | Commercial POD Resale Terms | Data Retention Policy | Latency | SDK / API Difficulty |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Generation** | **OpenAI DALL-E 3** | ~$0.040 / image | 1024×1024 (HD: 1792×1024) | No (RGB only) | **Full commercial ownership** (user owns outputs; suitable for apparel resale) | 30 days abuse monitoring; not trained on API inputs | 8–15s | Very Low (Standard REST/SDK) |
| **Generation** | **Flux.1 [dev] (Replicate)** | ~$0.025 / run | Up to 2048×2048 | No (RGB only) | Non-commercial license (restricted) unless using Flux.1 [schnell] or Pro | Provider dependent; ephemeral caching | 5–12s | Low |
| **Generation** | **Flux.1 [schnell] (fal.ai/Replicate)** | ~$0.003 / run | Up to 1536×1536 | No (RGB only) | **Apache 2.0 (Permissive commercial use)** | Ephemeral | 2–5s | Low |
| **Generation** | **Zenith Procedural Engine (Local)** | **$0.00 (Free)** | Vector (Infinite / 10240×10240) | **Native 8-bit RGBA** | **100% Unrestricted Private** | Zero retention (100% local memory) | **<100ms** | Built-in |
| **BG Removal** | **rembg (u2net / BiRefNet)** | **$0.00 (Free)** | Unlimited (hardware memory bound) | **True RGBA (Color Type 6)** | **MIT License (Commercial permissible)** | 100% Local / Zero retention | 2–6s (CPU) | Built-in Python bridge |
| **BG Removal** | **remove.bg API** | ~$0.20–$0.90 / image | Up to 25 MP (Full HD) | True RGBA | Permitted for commercial merchandise | Auto-deleted within 1 hour | 1–3s | Low |
| **BG Removal** | **fal.ai BiRefNet v2** | ~$0.005 / image | Up to 4096×4096 | True RGBA | Permitted for commercial use | Ephemeral | 1–2s | Low |
| **Upscaling** | **Lanczos3 + Unsharp Mask (Local)** | **$0.00 (Free)** | Up to 500 Megapixels | **Lossless RGBA Plane Preserved** | **MIT / libvips (100% Unrestricted)** | 100% Local / Zero retention | **<500ms** | Built-in Sharp |
| **Upscaling** | **Real-ESRGAN (Replicate)** | ~$0.002 / run | Up to 4096×4096 | RGB (alpha requires separate channel pass) | BSD 3-Clause (Commercial permissible) | Ephemeral | 3–8s | Low |
| **Upscaling** | **Topaz Gigapixel Cloud API** | ~$0.05–$0.10 / image | Up to 32,000×32,000 | Alpha preserved | Commercial printing permitted | Retention varies by enterprise tier | 5–15s | Moderate |

---

## 2. Recommended Production Stack for Zenith District

For a small streetwear brand operating via Qikink (target volume: **200 apparel designs / month**):

1. **Background Removal:** **Local `rembg` (u2net / BiRefNet)**
   - *Cost:* **$0.00 / month**
   - *Advantage:* Zero per-image marginal cost, 100% privacy, produces clean 4-channel RGBA.
2. **Upscaling & Resampling:** **Lanczos3 + Unsharp Mask (Local libvips)**
   - *Cost:* **$0.00 / month**
   - *Advantage:* Mathematical fidelity, no hallucinated artifacts on typography/lettering, instant execution.
3. **AI Generation (Optional Paid):** **OpenAI DALL-E 3** or **Flux.1 [schnell]**
   - *At 200 designs/month with 2 variations per prompt:*
     - Using DALL-E 3: `200 designs × 2 candidates × $0.040 = $16.00 / month`
     - Using Flux.1 schnell on fal.ai: `200 designs × 2 candidates × $0.003 = $1.20 / month`
     - Using Free Local Mode: **$0.00 / month**

**Total Monthly Estimated Cloud Bill:** **$0.00 (Free Mode)** to **$16.00 / month (Paid AI Generation Stack)**.
