import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'V', desc: 'Select & Transform tool' },
    { key: 'C', desc: 'Crop tool' },
    { key: 'E', desc: 'Eraser brush' },
    { key: 'B', desc: 'Restore brush (from original)' },
    { key: 'D', desc: 'Edge Defringe / Alpha Choke' },
    { key: 'H', desc: 'Hand / Pan Canvas' },
    { key: 'Space + Drag', desc: 'Quick Pan' },
    { key: '+ / -', desc: 'Zoom In / Out' },
    { key: '0', desc: 'Fit Canvas to Screen' },
    { key: 'Ctrl + Z', desc: 'Undo' },
    { key: 'Ctrl + Y', desc: 'Redo' },
    { key: 'Ctrl + E', desc: 'Export Print File' },
    { key: 'Ctrl + G', desc: 'Open AI Graphic Generator' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '480px',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-panel)',
        }}
      >
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
            <Keyboard size={18} color="var(--accent-cyan)" />
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#FFF' }}>
              KEYBOARD SHORTCUTS
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {shortcuts.map((s) => (
            <div
              key={s.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                padding: '4px 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>{s.desc}</span>
              <kbd
                style={{
                  background: 'var(--bg-control)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--accent-cyan)',
                }}
              >
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
