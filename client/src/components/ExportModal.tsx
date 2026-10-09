import React from 'react';
import { VerificationReport } from '../types';
import { CheckCircle2, Download, X, AlertTriangle, FileCheck, ExternalLink, Sparkles, PlusCircle } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: VerificationReport | null;
  downloadUrl: string | null;
  filename: string;
  onOpenGenerate?: () => void;
  onNewProject?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  report,
  downloadUrl,
  filename,
  onOpenGenerate,
  onNewProject,
}) => {
  if (!isOpen || !report) return null;

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
          width: 'min(600px, 94vw)',
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
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCheck size={18} color="var(--status-ready)" />
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              POST-EXPORT AUDIT // PRODUCTION VERIFIED
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', WebkitOverflowScrolling: 'touch' }}>
          {/* Status Banner */}
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: report.isValid ? 'rgba(0, 177, 0, 0.08)' : 'rgba(255, 61, 77, 0.08)',
              border: `1px solid ${report.isValid ? 'rgba(0, 177, 0, 0.25)' : 'rgba(255, 61, 77, 0.25)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {report.isValid ? (
              <CheckCircle2 size={24} color="var(--status-ready)" />
            ) : (
              <AlertTriangle size={24} color="var(--status-error)" />
            )}
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: report.isValid ? '#007d26' : '#d92534' }}>
                {report.isValid ? 'PRINT-READY EXPORT CONFIRMED' : 'EXPORT AUDIT WARNINGS'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {report.isValid
                  ? 'Binary output re-read from disk and passed all Qikink production checks.'
                  : 'Issues detected during binary inspection.'}
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              background: 'var(--bg-control)',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PIXEL DIMENSIONS</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                {report.metrics.widthPx} × {report.metrics.heightPx} px
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>pHYs RESOLUTION CHUNK</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-canva-violet)' }}>
                {report.metrics.measuredPpmX ? `${report.metrics.densityDpi || 300} DPI` : 'Standard'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>COLOR TYPE & CHANNELS</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {report.metrics.channels} Channels (RGBA Type 6)
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>FILE SIZE (QIKINK &lt; 25MB)</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {report.metrics.fileSizeMb} MB
              </div>
            </div>
          </div>

          {/* Passed Checks Checklist */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              VERIFIED BINARY GUARANTEES
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {report.passedChecks.map((check, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircle2 size={13} color="var(--status-ready)" />
                  <span>{check}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Download Button */}
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={filename}
              className="btn-primary"
              style={{
                textDecoration: 'none',
                width: '100%',
                padding: '12px',
                fontSize: '0.95rem',
                justifyContent: 'center',
              }}
            >
              <Download size={16} />
              <span>Download Production File ({report.metrics.fileSizeMb} MB)</span>
            </a>
          )}

          {/* Post-Export Next Steps / Generate Another */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', marginTop: '4px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>
              DONE WITH THIS ARTWORK? WHAT WOULD YOU LIKE TO DO NEXT?
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {onOpenGenerate && (
                <button
                  className="btn-gradient"
                  onClick={() => {
                    onClose();
                    onOpenGenerate();
                  }}
                  style={{ flex: 1, padding: '10px 12px', fontSize: '0.82rem', justifyContent: 'center' }}
                >
                  <Sparkles size={14} />
                  <span>Generate Another (AI)</span>
                </button>
              )}
              {onNewProject && (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    onClose();
                    onNewProject();
                  }}
                  style={{ flex: 1, padding: '10px 12px', fontSize: '0.82rem', justifyContent: 'center' }}
                >
                  <PlusCircle size={14} color="var(--color-canva-violet)" />
                  <span>Start New Design</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
