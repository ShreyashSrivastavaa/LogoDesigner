import React, { useState } from 'react';
import { ProjectVersion } from '../types';
import { X, SplitSquareVertical } from 'lucide-react';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: ProjectVersion[];
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  onClose,
  versions,
}) => {
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(Math.min(1, versions.length - 1));
  const [sliderPos, setSliderPos] = useState(50); // 0 to 100%
  const [bgMode, setBgMode] = useState<'checker' | 'black' | 'white'>('checker');

  if (!isOpen || versions.length < 2) return null;

  const leftVer = versions[leftIndex] || versions[0];
  const rightVer = versions[rightIndex] || versions[1];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 16, 21, 0.45)',
        backdropFilter: 'blur(10px)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          height: '60px',
          padding: '0 24px',
          background: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SplitSquareVertical size={18} color="var(--color-canva-violet)" />
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              BEFORE / AFTER COMPARISON
            </span>
          </div>

          {/* Background Toggle */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-control)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            {(['checker', 'black', 'white'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setBgMode(mode)}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  background: bgMode === mode ? '#ffffff' : 'transparent',
                  color: bgMode === mode ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: bgMode === mode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                }}
              >
                {mode === 'checker' ? 'Checkerboard' : mode === 'black' ? 'Dark Garment' : 'Light Garment'}
              </button>
            ))}
          </div>
        </div>

        {/* Version Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Before:</span>
            <select
              value={leftIndex}
              onChange={(e) => setLeftIndex(parseInt(e.target.value, 10))}
              style={{ width: '160px', padding: '4px 8px' }}
            >
              {versions.map((v, i) => (
                <option key={v.id} value={i}>
                  v{v.versionNumber}: {v.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>After:</span>
            <select
              value={rightIndex}
              onChange={(e) => setRightIndex(parseInt(e.target.value, 10))}
              style={{ width: '160px', padding: '4px 8px' }}
            >
              {versions.map((v, i) => (
                <option key={v.id} value={i}>
                  v{v.versionNumber}: {v.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Split Comparison Canvas */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bgMode === 'black' ? '#0f1015' : bgMode === 'white' ? '#FFFFFF' : '#f0f2f5',
        }}
        className={bgMode === 'checker' ? 'checkerboard-pattern' : ''}
      >
        <div
          style={{
            width: '800px',
            height: '600px',
            position: 'relative',
            boxShadow: 'var(--shadow-floating-canvas)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {/* Base Layer: Right Version (After) */}
          <img
            src={rightVer.previewUrl}
            alt="after"
            onError={(e) => {
              if (rightVer.dataUrl && rightVer.previewUrl !== rightVer.dataUrl) {
                (e.currentTarget as HTMLImageElement).src = rightVer.dataUrl;
              }
            }}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />

          {/* Overlaid Clipped Layer: Left Version (Before) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              width: `${sliderPos}%`,
              borderRight: '2px solid var(--color-canva-violet)',
            }}
          >
            <img
              src={leftVer.previewUrl}
              alt="before"
              onError={(e) => {
                if (leftVer.dataUrl && leftVer.previewUrl !== leftVer.dataUrl) {
                  (e.currentTarget as HTMLImageElement).src = leftVer.dataUrl;
                }
              }}
              style={{
                width: '800px',
                height: '600px',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Interactive Split Slider Handle */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${sliderPos}%`,
              transform: 'translateX(-50%)',
              width: '32px',
              cursor: 'ew-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startPos = sliderPos;
              const onMove = (moveEv: MouseEvent) => {
                const delta = moveEv.clientX - startX;
                const newPos = Math.max(5, Math.min(95, startPos + (delta / 800) * 100));
                setSliderPos(newPos);
              };
              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'var(--color-canva-violet)',
                border: '2px solid #ffffff',
                boxShadow: '0 2px 8px rgba(139, 61, 255, 0.45)',
              }}
            />
          </div>

          {/* Labels */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              background: 'rgba(0,0,0,0.7)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              color: '#FFF',
              fontFamily: 'var(--font-mono)',
            }}
          >
            BEFORE: v{leftVer.versionNumber} ({leftVer.label})
          </div>
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(0,0,0,0.7)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              color: '#FFF',
              fontFamily: 'var(--font-mono)',
            }}
          >
            AFTER: v{rightVer.versionNumber} ({rightVer.label})
          </div>
        </div>
      </div>
    </div>
  );
};
