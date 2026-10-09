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
  Sliders,
} from 'lucide-react';
import { ValidationReport } from '../types';

interface HeaderProps {
  onOpenGenerate: () => void;
  onUploadClick: () => void;
  onOpenShortcuts: () => void;
  onOpenMobileDrawer?: () => void;
  validation: ValidationReport | null;
  projectName: string;
  isPresetVerified?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenGenerate,
  onUploadClick,
  onOpenShortcuts,
  onOpenMobileDrawer,
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
          <span className="hide-mobile">300 DPI // READY TO EXPORT</span>
          <span className="mobile-only">300 DPI</span>
        </div>
      );
    }
    if (validation.status === 'ready_with_warnings') {
      return (
        <div className="badge-unverified" title={validation.warnings[0] || 'Ready with warnings'}>
          <AlertTriangle size={12} />
          <span className="hide-mobile">READY WITH WARNINGS</span>
          <span className="mobile-only">WARNING</span>
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
        padding: '0 12px',
        zIndex: 50,
        gap: '8px',
      }}
    >
      {/* Brand & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <img
            src="/brand/zenith_lab_app_icon.png"
            alt="Zenith Lab"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-subtle)',
              display: 'block',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                className="font-heading"
                style={{
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  fontSize: '0.98rem',
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
                  padding: '1px 5px',
                  borderRadius: '9999px',
                  fontSize: '0.62rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                STUDIO
              </span>
            </div>
            <span
              className="desktop-only"
              style={{
                fontSize: '0.56rem',
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

        <div className="desktop-only" style={{ height: '20px', width: '1px', background: 'var(--border-subtle)' }} />

        <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span
            style={{
              fontSize: '0.84rem',
              color: 'var(--color-ink-black)',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '240px',
            }}
          >
            {projectName}
          </span>
          {getStatusBadge()}
        </div>
      </div>

      {/* Center Provenance Tag (Desktop Only) */}
      <div
        className="desktop-only"
        style={{
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
          whiteSpace: 'nowrap',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {getStatusBadge() && <div className="mobile-only">{getStatusBadge()}</div>}

        <button
          className="btn-gradient"
          onClick={onOpenGenerate}
          title="Generate artwork with AI"
          style={{ padding: '7px 12px', fontSize: '0.82rem' }}
        >
          <Sparkles size={14} />
          <span className="hide-mobile">Magic Generate</span>
          <span className="mobile-only">AI</span>
        </button>

        <button
          className="btn-primary"
          onClick={onUploadClick}
          style={{ padding: '7px 12px', fontSize: '0.82rem' }}
        >
          <Upload size={14} />
          <span className="hide-mobile">Upload Artwork</span>
          <span className="mobile-only">Upload</span>
        </button>

        <button
          className="btn-secondary desktop-only"
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts"
          style={{ padding: '7px' }}
        >
          <HelpCircle size={15} />
        </button>

        {onOpenMobileDrawer && (
          <button
            className="mobile-only btn-secondary"
            onClick={onOpenMobileDrawer}
            title="Open Studio Controls"
            style={{ padding: '7px 10px', gap: '4px' }}
          >
            <Sliders size={15} color="var(--color-canva-violet)" />
            <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Tools</span>
          </button>
        )}
      </div>
    </header>
  );
};
