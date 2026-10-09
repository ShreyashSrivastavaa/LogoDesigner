import React, { useState, useRef } from 'react';
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
  const boxRef = useRef<HTMLDivElement>(null);

  if (!isOpen || versions.length < 2) return null;

  const leftVer = versions[leftIndex] || versions[0];
  const rightVer = versions[rightIndex] || versions[1];

  const updateSliderFromClientX = (clientX: number) => {
    if (!boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(2, Math.min(98, pos)));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      updateSliderFromClientX(e.touches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      updateSliderFromClientX(e.touches[0].clientX);
    }
  };

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
          minHeight: '56px',
          padding: '8px 16px',
          background: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SplitSquareVertical size={18} color="var(--color-canva-violet)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              BEFORE / AFTER
            </span>
          </div>

          {/* Background Toggle */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-control)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            {(['checker', 'black', 'white'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setBgMode(mode)}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.70rem',
                  fontWeight: 500,
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  background: bgMode === mode ? '#ffffff' : 'transparent',
                  color: bgMode === mode ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: bgMode === mode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                }}
              >
                {mode === 'checker' ? 'Checker' : mode === 'black' ? 'Dark' : 'Light'}
              </button>
            ))}
          </div>
        </div>

        {/* Version Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Before:</span>
            <select
              value={leftIndex}
              onChange={(e) => setLeftIndex(parseInt(e.target.value, 10))}
              style={{ width: '120px', padding: '3px 6px', fontSize: '0.75rem' }}
            >
              {versions.map((v, i) => (
                <option key={v.id} value={i}>
                  v{v.versionNumber}: {v.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>After:</span>
            <select
              value={rightIndex}
              onChange={(e) => setRightIndex(parseInt(e.target.value, 10))}
              style={{ width: '120px', padding: '3px 6px', fontSize: '0.75rem' }}
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
            aria-label="Close"
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
          padding: '12px',
          backgroundColor: bgMode === 'black' ? '#0f1015' : bgMode === 'white' ? '#FFFFFF' : '#f0f2f5',
        }}
        className={bgMode === 'checker' ? 'checkerboard-pattern' : ''}
      >
        <div
          ref={boxRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          style={{
            width: 'min(800px, 94vw)',
            height: 'min(600px, 65vh)',
            aspectRatio: '4 / 3',
            position: 'relative',
            boxShadow: 'var(--shadow-floating-canvas)',
            borderRadius: '8px',
            overflow: 'hidden',
            touchAction: 'none',
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
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />

          {/* Overlaid Clipped Layer: Left Version (Before) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              clipPath: `inset(0 calc(100% - ${sliderPos}%) 0 0)`,
              borderRight: '2px solid var(--color-canva-violet)',
              pointerEvents: 'none',
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
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                userSelect: 'none',
              }}
            />
          </div>

          {/* Vertical Divider Line */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${sliderPos}%`,
              width: '2px',
              background: 'var(--color-canva-violet)',
              pointerEvents: 'none',
            }}
          />

          {/* Interactive Split Slider Handle */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${sliderPos}%`,
              transform: 'translateX(-50%)',
              width: '40px',
              cursor: 'ew-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              touchAction: 'none',
            }}
            onMouseDown={(e) => {
              const onMove = (moveEv: MouseEvent) => {
                updateSliderFromClientX(moveEv.clientX);
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
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'var(--color-canva-violet)',
                border: '2px solid #ffffff',
                boxShadow: '0 2px 8px rgba(139, 61, 255, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ width: '4px', height: '10px', borderLeft: '1.5px solid #fff', borderRight: '1.5px solid #fff' }} />
            </div>
          </div>

          {/* Labels */}
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'rgba(0,0,0,0.7)',
              padding: '3px 6px',
              borderRadius: '4px',
              fontSize: '0.68rem',
              color: '#FFF',
              fontFamily: 'var(--font-mono)',
              pointerEvents: 'none',
            }}
          >
            BEFORE: v{leftVer.versionNumber}
          </div>
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'rgba(0,0,0,0.7)',
              padding: '3px 6px',
              borderRadius: '4px',
              fontSize: '0.68rem',
              color: '#FFF',
              fontFamily: 'var(--font-mono)',
              pointerEvents: 'none',
            }}
          >
            AFTER: v{rightVer.versionNumber}
          </div>
        </div>
      </div>
    </div>
  );
};



