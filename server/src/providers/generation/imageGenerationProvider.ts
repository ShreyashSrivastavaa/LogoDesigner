import crypto from 'node:crypto';
import sharp from 'sharp';
import {
  ImageGenerationProvider,
  GenerationParams,
  GeneratedCandidate,
} from '../types.js';

export class StandaloneGraphicGenerationProvider implements ImageGenerationProvider {
  public readonly name = 'zenith-ai-generator';

  public async isAvailable(): Promise<boolean> {
    return Boolean(process.env.OPENAI_API_KEY || process.env.REPLICATE_API_TOKEN);
  }

  public async generate(params: GenerationParams): Promise<GeneratedCandidate[]> {
    const hasKey = await this.isAvailable();
    const count = params.count || 2;

    if (hasKey && process.env.OPENAI_API_KEY) {
      // Production path with OpenAI DALL-E 3
      try {
        const enhancedPrompt = this.buildPrompt(params);
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: enhancedPrompt,
            n: 1,
            size: '1024x1024',
            response_format: 'b64_json',
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            data: Array<{ b64_json: string }>;
          };
          const b64 = data.data[0].b64_json;
          const buf = Buffer.from(b64, 'base64');
          const meta = await sharp(buf).metadata();

          return [
            {
              id: crypto.randomUUID(),
              buffer: buf,
              mimeType: 'image/png',
              width: meta.width || 1024,
              height: meta.height || 1024,
              hasAlpha: meta.hasAlpha || false,
              provider: 'OpenAI DALL-E 3',
              costEstimateUsd: 0.04,
            },
          ];
        }
      } catch (err) {
        console.warn('OpenAI generation error, falling back to procedural candidates:', err);
      }
    }

    // Procedural High-Fidelity Streetwear Graphic Fallback (Offline / Free Local Mode)
    // Produces crisp 1024x1024 vector-rendered transparent streetwear graphic candidates
    const candidates: GeneratedCandidate[] = [];

    for (let i = 0; i < count; i++) {
      const candidateBuf = await this.renderProceduralGraphic(params, i);
      const meta = await sharp(candidateBuf).metadata();
      candidates.push({
        id: crypto.randomUUID(),
        buffer: candidateBuf,
        mimeType: 'image/png',
        width: meta.width || 1024,
        height: meta.height || 1024,
        hasAlpha: true,
        provider: 'Zenith Vector Engine (Free Local Mode)',
        costEstimateUsd: 0.0,
      });
    }

    return candidates;
  }

  private buildPrompt(params: GenerationParams): string {
    const styleModifier = {
      streetwear: 'bold Tokyo/Berlin cyberpunk streetwear apparel graphic, dark aesthetic, screenprint texture',
      typography: 'brutalist typography, distressed kinetic typeface, streetwear statement layout',
      vintage: '1990s vintage bootleg rap tee style, halftones, retro worn washed ink effect',
      minimal: 'clean minimalist geometric architectural emblem, monochrome luxury streetwear',
      anime: 'mecha cyber-anime high-contrast ink linework, cel-shaded, edgy streetwear illustration',
      custom: 'contemporary high-fashion streetwear graphic artwork',
    }[params.style];

    const negativeConstraints =
      'CRITICAL PRINT PRODUCTION CONSTRAINTS: Must be a STANDALONE graphic element on solid black or transparent background. DO NOT draw a t-shirt or garment. DO NOT draw a person or mannequin wearing clothing. DO NOT include mockup folds, hangers, or shadows. Pure isolated graphic artwork only.';

    return `${params.prompt}. Style: ${styleModifier}. Composition: ${params.composition}. ${negativeConstraints}`;
  }

  private async renderProceduralGraphic(
    params: GenerationParams,
    seedIndex: number
  ): Promise<Buffer> {
    const colors = [
      ['#FF3366', '#7928CA', '#00DFD8'],
      ['#F5A623', '#D0021B', '#F8E71C'],
      ['#50E3C2', '#0070F3', '#7928CA'],
      ['#FFFFFF', '#888888', '#222222'],
    ][seedIndex % 4];

    const promptWord =
      params.prompt.split(' ').filter(Boolean).slice(0, 3).join(' ').toUpperCase() ||
      'ZENITH DISTRICT';

    const svg = `
      <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad${seedIndex}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${colors[0]}" />
            <stop offset="50%" stop-color="${colors[1]}" />
            <stop offset="100%" stop-color="${colors[2]}" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- Streetwear Graphic Emblem -->
        <g transform="translate(512, 512)">
          <!-- Outer Geometric Framing -->
          <circle cx="0" cy="0" r="340" fill="none" stroke="url(#grad${seedIndex})" stroke-width="8" stroke-dasharray="15 10"/>
          <polygon points="0,-280 242,-140 242,140 0,280 -242,140 -242,-140" fill="none" stroke="${colors[0]}" stroke-width="6"/>
          
          <!-- Cyber/Street Crosshairs -->
          <line x1="-380" y1="0" x2="-280" y2="0" stroke="#FFF" stroke-width="4"/>
          <line x1="280" y1="0" x2="380" y2="0" stroke="#FFF" stroke-width="4"/>
          <line x1="0" y1="-380" x2="0" y2="-280" stroke="#FFF" stroke-width="4"/>
          <line x1="0" y1="280" x2="0" y2="380" stroke="#FFF" stroke-width="4"/>
          
          <!-- Central Streetwear Bold Typography -->
          <text x="0" y="-30" font-family="monospace, sans-serif" font-weight="900" font-size="42" fill="#FFFFFF" text-anchor="middle" letter-spacing="8">
            ${promptWord}
          </text>
          <text x="0" y="30" font-family="monospace, sans-serif" font-weight="700" font-size="20" fill="url(#grad${seedIndex})" text-anchor="middle" letter-spacing="12">
            ZENITH DISTRICT // POD
          </text>
          
          <!-- High-Contrast Vector Accent -->
          <rect x="-180" y="70" width="360" height="4" fill="${colors[1]}"/>
          <text x="0" y="110" font-family="sans-serif" font-weight="600" font-size="14" fill="#888888" text-anchor="middle" letter-spacing="4">
            300 DPI // STANDALONE GRAPHIC SPEC
          </text>
        </g>
      </svg>
    `;

    return sharp(Buffer.from(svg))
      .png({ palette: false, compressionLevel: 9 })
      .toBuffer();
  }
}
