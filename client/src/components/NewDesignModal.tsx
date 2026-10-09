import React from 'react';
import { X, Sparkles, Upload, Trash2, PlusCircle } from 'lucide-react';

interface NewDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChooseGenerate: () => void;
  onChooseUpload: () => void;
  onClearCanvas: () => void;
}

export const NewDesignModal: React.FC<NewDesignModalProps> = ({
  isOpen,
  onClose,
  onChooseGenerate,
  onChooseUpload,
  onClearCanvas,
}) => {
  if (!isOpen) return null;

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
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: 'min(500px, 94vw)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-panel)',
          overflow: 'hidden',
          animation: 'fadeInOverlay 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusCircle size={18} color="var(--color-canva-violet)" />
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              START A NEW DESIGN
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

        {/* Content Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '0 0 4px 0' }}>
            Ready to design your next print? Choose how you want to begin:
          </p>

          {/* Option 1: AI Generator */}
          <button
            onClick={() => {
              onClose();
              onChooseGenerate();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid rgba(139, 61, 255, 0.35)',
              background: 'linear-gradient(135deg, rgba(139, 61, 255, 0.05) 0%, rgba(0, 196, 204, 0.05) 100%)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'var(--gradient-teal-violet-sky)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <Sparkles size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-canva-violet)' }}>
                Generate with AI (Magic Generate)
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Type a streetwear prompt and generate fresh high-res graphics
              </div>
            </div>
          </button>

          {/* Option 2: Upload Artwork */}
          <button
            onClick={() => {
              onClose();
              onChooseUpload();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-panel)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'var(--bg-control)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
                flexShrink: 0,
              }}
            >
              <Upload size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Upload From Device
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Pick another PNG, JPEG, or WebP logo/file from your files
              </div>
            </div>
          </button>

          {/* Option 3: Clear to Blank Canvas */}
          <button
            onClick={() => {
              onClose();
              onClearCanvas();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-control)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255, 61, 77, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--status-error)',
                flexShrink: 0,
              }}
            >
              <Trash2 size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Clear Canvas
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Empty current artwork and start with a blank apparel preview
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
