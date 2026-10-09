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
          <History size={16} color="var(--color-canva-violet)" />
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
                title={`Click to restore v${ver.versionNumber}: ${ver.label} (${ver.provenance.label})`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: isSelected ? 'rgba(139, 61, 255, 0.08)' : 'var(--bg-control)',
                  border: isSelected ? '1px solid var(--color-canva-violet)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 1px 3px rgba(139, 61, 255, 0.15)' : 'none',
                }}
              >
                <img
                  src={ver.previewUrl}
                  alt={ver.label}
                  onError={(e) => {
                    if (ver.dataUrl && ver.previewUrl !== ver.dataUrl) {
                      (e.currentTarget as HTMLImageElement).src = ver.dataUrl;
                    }
                  }}
                  style={{ width: '28px', height: '28px', objectFit: 'contain', background: '#f8f9fa', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}
                />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 600, color: isSelected ? 'var(--color-canva-violet)' : 'var(--text-primary)' }}>
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
          <SplitSquareVertical size={14} color="var(--color-canva-violet)" />
          <span>Before / After Compare</span>
        </button>
      </div>
    </footer>
  );
};
