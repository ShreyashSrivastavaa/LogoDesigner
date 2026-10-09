import React, { useState } from 'react';
import { Sparkles, X, Check, ShieldAlert, Cpu } from 'lucide-react';

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCandidate: (
    candidateUrl: string,
    fileId: string,
    width: number,
    height: number,
    previewDataUrl?: string
  ) => void;
}

export const GenerateModal: React.FC<GenerateModalProps> = ({
  isOpen,
  onClose,
  onSelectCandidate,
}) => {
  const [prompt, setPrompt] = useState('Cyberpunk Oni mask mechanical typography');
  const [style, setStyle] = useState<'streetwear' | 'typography' | 'vintage' | 'minimal' | 'anime'>('streetwear');
  const [composition, setComposition] = useState<'centered_emblem' | 'full_chest' | 'stacked' | 'badge'>('centered_emblem');
  const [count, setCount] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style, composition, count }),
      });
      const data = await res.json();
      if (res.ok && data.candidates) {
        setCandidates(data.candidates);
      } else {
        setError(data.error || 'Generation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 16, 21, 0.45)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: 'min(680px, 94vw)',
          maxHeight: '92dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-panel)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--color-canva-violet)" />
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              AI STREETWEAR GRAPHIC GENERATOR
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', WebkitOverflowScrolling: 'touch' }}>
          {/* Negative Constraints Notice */}
          <div
            style={{
              background: 'rgba(139, 61, 255, 0.05)',
              border: '1px solid rgba(139, 61, 255, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '10px',
              fontSize: '0.74rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <ShieldAlert size={16} color="var(--color-canva-violet)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Print-Only Graphic Constraint Active:</strong> Prompts are strictly restricted to standalone graphics and vector emblems. Models are commanded never to generate t-shirt garments, folds, or human mockups in the pixel data.
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              DESIGN PROMPT
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your streetwear artwork..."
            />
          </div>

          {/* Style Presets */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              STYLE PRESET
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              {[
                { id: 'streetwear', label: 'Cyberpunk Streetwear' },
                { id: 'typography', label: 'Brutalist Typography' },
                { id: 'vintage', label: '90s Bootleg Vintage' },
                { id: 'minimal', label: 'Minimal Luxury' },
                { id: 'anime', label: 'Mecha Cyber Anime' },
              ].map((s) => (
                <button
                  key={s.id}
                  className="btn-secondary"
                  onClick={() => setStyle(s.id as any)}
                  style={{
                    justifyContent: 'center',
                    background: style === s.id ? 'rgba(139, 61, 255, 0.1)' : 'var(--bg-control)',
                    borderColor: style === s.id ? 'var(--color-canva-violet)' : 'var(--border-subtle)',
                    color: style === s.id ? 'var(--color-canva-violet)' : 'var(--text-secondary)',
                    fontSize: '0.72rem',
                    fontWeight: style === s.id ? 600 : 500,
                    padding: '8px 6px',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Composition */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              COMPOSITION
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px' }}>
              {[
                { id: 'centered_emblem', label: 'Centered Emblem' },
                { id: 'full_chest', label: 'Full Chest Poster' },
                { id: 'stacked', label: 'Stacked Layout' },
                { id: 'badge', label: 'Pocket Badge' },
              ].map((c) => (
                <button
                  key={c.id}
                  className="btn-secondary"
                  onClick={() => setComposition(c.id as any)}
                  style={{
                    justifyContent: 'center',
                    background: composition === c.id ? 'rgba(139, 61, 255, 0.1)' : 'var(--bg-control)',
                    borderColor: composition === c.id ? 'var(--color-canva-violet)' : 'var(--border-subtle)',
                    color: composition === c.id ? 'var(--color-canva-violet)' : 'var(--text-secondary)',
                    fontSize: '0.72rem',
                    fontWeight: composition === c.id ? 600 : 500,
                    padding: '8px 4px',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            className="btn-gradient"
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            style={{ width: '100%', padding: '12px', fontSize: '0.92rem' }}
          >
            {isLoading ? (
              <>
                <span className="animate-spin">◌</span>
                <span>Rendering High-Res Candidates...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Generate Graphic Variations (Local Free Mode / AI)</span>
              </>
            )}
          </button>

          {error && (
            <div style={{ color: 'var(--accent-pink)', fontSize: '0.78rem' }}>{error}</div>
          )}

          {/* Candidates Results Grid */}
          {candidates.length > 0 && (
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                SELECT CANDIDATE TO ADD AS PROJECT VERSION
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {candidates.map((c) => (
                  <div
                    key={c.id}
                    className="checkerboard-pattern"
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <img
                      src={c.previewDataUrl || c.url}
                      alt="candidate"
                      style={{ width: '100%', height: '180px', objectFit: 'contain' }}
                    />
                    <div
                      style={{
                        padding: '8px 12px',
                        background: '#ffffff',
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {c.width}x{c.height}px • {c.provider}
                      </div>
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          onSelectCandidate(c.previewDataUrl || c.url, c.fileId, c.width, c.height, c.previewDataUrl);
                          onClose();
                        }}
                        style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                      >
                        <Check size={12} />
                        <span>Select</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
