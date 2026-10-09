import React from 'react';
import { ProjectVersion } from '../types';
import { History, SplitSquareVertical, GitBranch, Clock } from 'lucide-react';

interface BottomPanelProps {
  versions: ProjectVersion[];
  currentVersionId: string;
  onSelectVersion: (v: ProjectVersion) => void;
  onOpenCompare: () => void;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  versions,
  currentVersionId,
  onSelectVersion,
  onOpenCompare,
}) => {
  return (
    <footer
      style={{
        height: '76px',
        background: 'var(--bg-studio)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 40,
      }}
    >
      {/* Version Timeline Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
          <History size={16} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-heading)', letterSpacing: '0.04em' }}>
            VERSION TIMELINE ({versions.length})
          </span>
        </div>

        {/* Version Thumbnails Carousel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {versions.map((ver) => {
            const isSelected = ver.id === currentVersionId;
            return (
              <button
                key={ver.id}
                onClick={() => onSelectVersion(ver)}
                title={`${ver.label} - ${ver.provenance.label}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: isSelected ? 'rgba(0, 223, 216, 0.12)' : 'var(--bg-control)',
                  border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <img
                  src={ver.previewUrl}
                  alt={ver.label}
                  style={{ width: '28px', height: '28px', objectFit: 'contain', background: '#000', borderRadius: '4px' }}
                />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 600, color: isSelected ? '#FFF' : 'var(--text-secondary)' }}>
                    v{ver.versionNumber}: {ver.label}
                  </div>
                  <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {ver.width}x{ver.height}px
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Compare Tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          className="btn-secondary"
          onClick={onOpenCompare}
          disabled={versions.length < 2}
          title={versions.length < 2 ? 'Need at least 2 versions to compare' : 'Open Split Compare'}
          style={{ fontSize: '0.78rem' }}
        >
          <SplitSquareVertical size={14} color="var(--accent-cyan)" />
          <span>Before / After Compare</span>
        </button>
      </div>
    </footer>
  );
};
