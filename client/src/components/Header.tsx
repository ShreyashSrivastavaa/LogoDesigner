import React from 'react';
import {
  Sparkles,
  Upload,
  Layers,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { ValidationReport } from '../types';

interface HeaderProps {
  onOpenGenerate: () => void;
  onUploadClick: () => void;
  onOpenShortcuts: () => void;
  validation: ValidationReport | null;
  projectName: string;
  isPresetVerified?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenGenerate,
  onUploadClick,
  onOpenShortcuts,
  validation,
  projectName,
  isPresetVerified = false,
}) => {
  const getStatusBadge = () => {
    if (!validation) return null;
    if (validation.status === 'ready') {
      return (
        <div className="badge-verified" title="Artwork is print-ready for Qikink">
          <CheckCircle2 size={12} />
          <span>300 DPI // READY TO EXPORT</span>
        </div>
      );
    }
    if (validation.status === 'ready_with_warnings') {
      return (
        <div className="badge-unverified" title={validation.warnings[0] || 'Ready with warnings'}>
          <AlertTriangle size={12} />
          <span>READY WITH WARNINGS</span>
        </div>
      );
    }
    return (
      <div
        style={{
          background: 'rgba(255, 51, 102, 0.15)',
          color: '#FF3366',
          border: '1px solid rgba(255, 51, 102, 0.4)',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '0.72rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
        title={validation.errors[0] || 'Validation error'}
      >
        <AlertTriangle size={12} />
        <span>{validation.statusLabel.toUpperCase()}</span>
      </div>
    );
  };

  return (
    <header
      style={{
        height: '56px',
        background: 'var(--bg-studio)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 50,
      }}
    >
      {/* Brand & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #00DFD8 0%, #7928CA 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '14px',
              color: '#08080A',
              fontFamily: 'var(--font-heading)',
              boxShadow: '0 0 12px rgba(0, 223, 216, 0.35)',
            }}
          >
            Z
          </div>
          <span
            className="font-heading"
            style={{
              fontWeight: 800,
              letterSpacing: '0.08em',
              fontSize: '1rem',
              color: '#FFF',
            }}
          >
            ZENITH DISTRICT
          </span>
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-secondary)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.05em',
            }}
          >
            PRINT STUDIO
          </span>
        </div>

        <div style={{ height: '18px', width: '1px', background: 'var(--border-subtle)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            {projectName}
          </span>
          {getStatusBadge()}
        </div>
      </div>

      {/* Center Provenance Tag */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(0, 0, 0, 0.35)',
          padding: '4px 10px',
          borderRadius: '20px',
          border: isPresetVerified
            ? '1px solid var(--border-subtle)'
            : '1px solid rgba(255, 170, 0, 0.3)',
          fontSize: '0.72rem',
          color: isPresetVerified ? 'var(--text-muted)' : '#FFB84D',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {isPresetVerified ? (
          <>
            <ShieldCheck size={13} color="var(--accent-cyan)" />
            <span>IMMUTABLE ENGINE // QIKINK VERIFIED 300 DPI</span>
          </>
        ) : (
          <>
            <AlertTriangle size={13} color="var(--accent-amber)" />
            <span>IMMUTABLE ENGINE // UNVERIFIED PRESET</span>
          </>
        )}
      </div>

      {/* Quick Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          className="btn-secondary"
          onClick={onOpenGenerate}
          style={{
            borderColor: 'rgba(121, 40, 202, 0.4)',
            background: 'rgba(121, 40, 202, 0.1)',
            color: '#E0B0FF',
          }}
        >
          <Sparkles size={14} color="#00DFD8" />
          <span>AI Generate</span>
        </button>

        <button className="btn-secondary" onClick={onUploadClick}>
          <Upload size={14} />
          <span>Upload Artwork</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts"
          style={{ padding: '8px' }}
        >
          <HelpCircle size={15} />
        </button>
      </div>
    </header>
  );
};
