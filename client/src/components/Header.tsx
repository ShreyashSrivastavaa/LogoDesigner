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
            gap: '10px',
            textDecoration: 'none',
          }}
        >
          <img
            src="/brand/zenith_lab_app_icon.png"
            alt="Zenith Lab"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-subtle)',
              display: 'block',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                className="font-heading"
                style={{
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  fontSize: '1.02rem',
                  color: 'var(--color-ink-black)',
                }}
              >
                ZENITH <span style={{ color: 'var(--color-canva-violet)' }}>LAB</span>
              </span>
              <span
                style={{
                  background: 'rgba(139, 61, 255, 0.08)',
                  color: 'var(--color-canva-violet)',
                  border: '1px solid rgba(139, 61, 255, 0.18)',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  fontSize: '0.64rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                STUDIO
              </span>
            </div>
            <span
              style={{
                fontSize: '0.58rem',
                letterSpacing: '0.08em',
                color: 'var(--color-slate-smoke)',
                fontFamily: 'var(--font-heading)',
                fontWeight: 500,
                textTransform: 'uppercase',
              }}
            >
              BUILD · EXPERIMENT · EVOLVE
            </span>
          </div>
        </div>

        <div style={{ height: '20px', width: '1px', background: 'var(--border-subtle)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.86rem',
              color: 'var(--color-ink-black)',
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
          background: 'var(--bg-control)',
          padding: '4px 12px',
          borderRadius: '9999px',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.74rem',
          color: isPresetVerified ? 'var(--status-ready)' : 'var(--status-warning)',
          fontFamily: 'var(--font-heading)',
          fontWeight: 600,
        }}
      >
        {isPresetVerified ? (
          <>
            <ShieldCheck size={13} color="var(--status-ready)" />
            <span>QIKINK VERIFIED 300 DPI // PRODUCTION READY</span>
          </>
        ) : (
          <>
            <AlertTriangle size={13} color="var(--status-warning)" />
            <span>UNVERIFIED PRESET // SAMPLE TEST RECOMMENDED</span>
          </>
        )}
      </div>

      {/* Quick Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          className="btn-gradient"
          onClick={onOpenGenerate}
          title="Generate artwork with AI"
        >
          <Sparkles size={15} />
          <span>Magic Generate</span>
        </button>

        <button className="btn-primary" onClick={onUploadClick}>
          <Upload size={14} />
          <span>Upload Artwork</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts"
          style={{ padding: '8px' }}
        >
          <HelpCircle size={16} />
        </button>
      </div>
    </header>
  );
};
