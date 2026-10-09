import React, { useState } from 'react';
import {
  ProductPreset,
  GarmentPlacement,
  Layer,
  ValidationReport,
} from '../types';
import {
  Maximize2,
  Sliders,
  Sparkles,
  ShieldAlert,
  Download,
  Layers,
  Wand2,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  AlignCenter,
  ArrowUpDown,
} from 'lucide-react';

interface SidebarProps {
  products: ProductPreset[];
  selectedProduct: ProductPreset;
  onSelectProduct: (p: ProductPreset) => void;
  selectedPlacement: GarmentPlacement;
  onSelectPlacement: (pl: GarmentPlacement) => void;
  targetDpi: number;
  onDpiChange: (dpi: number) => void;
  layers: Layer[];
  activeLayer: Layer | null;
  onUpdateLayer: (updated: Partial<Layer>) => void;
  onDeleteLayer: (id: string) => void;
  validation: ValidationReport | null;
  onRunRemoveBg: (options?: {
    mode?: 'auto' | 'graphic' | 'photo';
    preserveFineDetail?: boolean;
    tolerance?: number;
  }) => void;
  isRemovingBg: boolean;
  bgRemovalError?: string | null;
  detectedBgMode?: 'graphic' | 'photo' | null;
  estimatedBgHex?: string | null;
  onRunUpscale: (scale: 2 | 4 | 8) => void;
  isUpscaling: boolean;
  onRunDefringe: (chokePx: number) => void;
  isDefringing: boolean;
  onExportClick: (format: 'PNG' | 'JPEG', trimEdges: boolean) => void;
  isExporting: boolean;
  onCenterLayer: () => void;
  onFitSafeMargin: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  products,
  selectedProduct,
  onSelectProduct,
  selectedPlacement,
  onSelectPlacement,
  targetDpi,
  onDpiChange,
  layers,
  activeLayer,
  onUpdateLayer,
  onDeleteLayer,
  validation,
  onRunRemoveBg,
  isRemovingBg,
  bgRemovalError,
  detectedBgMode,
  estimatedBgHex,
  onRunUpscale,
  isUpscaling,
  onRunDefringe,
  isDefringing,
  onExportClick,
  isExporting,
  onCenterLayer,
  onFitSafeMargin,
}) => {
  const [activeTab, setActiveTab] = useState<'placement' | 'layers' | 'enhance' | 'validate' | 'export'>('placement');
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [exportFormat, setExportFormat] = useState<'PNG' | 'JPEG'>('PNG');
  const [trimEdges, setTrimEdges] = useState(false);
  const [defringeChoke, setDefringeChoke] = useState(1);
  const [selectedBgMode, setSelectedBgMode] = useState<'auto' | 'graphic' | 'photo'>('auto');
  const [preserveFineDetail, setPreserveFineDetail] = useState(true);
  const [bgTolerance, setBgTolerance] = useState(14);

  // Unit conversion
  const displayW = unit === 'in'
    ? selectedPlacement.printWidthIn
    : Math.round(selectedPlacement.printWidthIn * 2.54 * 10) / 10;
  const displayH = unit === 'in'
    ? selectedPlacement.printHeightIn
    : Math.round(selectedPlacement.printHeightIn * 2.54 * 10) / 10;

  // Computed pixel dimensions
  const computedPxW = Math.round(selectedPlacement.printWidthIn * targetDpi);
  const computedPxH = Math.round(selectedPlacement.printHeightIn * targetDpi);

  return (
    <aside
      style={{
        width: '360px',
        background: 'var(--bg-studio)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        zIndex: 40,
      }}
    >
      {/* Sidebar Nav Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-panel)',
        }}
      >
        {[
          { id: 'placement', label: 'Size', icon: Maximize2 },
          { id: 'layers', label: 'Layers', icon: Layers },
          { id: 'enhance', label: 'Enhance', icon: Wand2 },
          { id: 'validate', label: 'Audit', icon: ShieldAlert },
          { id: 'export', label: 'Export', icon: Download },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: 1,
                padding: '12px 4px',
                background: isActive ? 'var(--bg-studio)' : 'transparent',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* TAB 1: SIZE & PLACEMENT */}
        {activeTab === 'placement' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Garment Selector */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                GARMENT PRESET (QIKINK)
              </label>
              <select
                value={selectedProduct.id}
                onChange={(e) => {
                  const found = products.find((p) => p.id === e.target.value);
                  if (found) {
                    onSelectProduct(found);
                    onSelectPlacement(found.placements[0]);
                  }
                }}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {selectedProduct.description}
              </div>
            </div>

            {/* Placement Selector */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                PRINT PLACEMENT
              </label>
              <select
                value={selectedPlacement.id}
                onChange={(e) => {
                  const pl = selectedProduct.placements.find((p) => p.id === e.target.value);
                  if (pl) onSelectPlacement(pl);
                }}
              >
                {selectedProduct.placements.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name} ({pl.printWidthIn}x{pl.printHeightIn} in)
                  </option>
                ))}
              </select>
            </div>

            {/* Provenance Badge */}
            <div
              style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>PROVENANCE & VERIFICATION</span>
                {selectedPlacement.provenance.verified ? (
                  <span className="badge-verified"><CheckCircle2 size={11} /> Verified Qikink Spec</span>
                ) : (
                  <span className="badge-unverified"><AlertTriangle size={11} /> Unverified (Custom)</span>
                )}
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                {selectedPlacement.provenance.notes}
              </p>
              {selectedPlacement.provenance.sourceUrl && (
                <a
                  href={selectedPlacement.provenance.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--accent-cyan)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '6px',
                    textDecoration: 'none',
                  }}
                >
                  <span>Official documentation source</span>
                  <ExternalLink size={10} />
                </a>
              )}
            </div>

            {/* Dimension Display & Unit Toggle */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  WIDTH ({unit.toUpperCase()})
                </label>
                <input type="text" readOnly value={`${displayW} ${unit}`} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  HEIGHT ({unit.toUpperCase()})
                </label>
                <input type="text" readOnly value={`${displayH} ${unit}`} />
              </div>
              <div style={{ paddingTop: '18px' }}>
                <button
                  className="btn-secondary"
                  onClick={() => setUnit(unit === 'in' ? 'cm' : 'in')}
                  title="Toggle unit"
                  style={{ padding: '8px 10px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
                >
                  {unit.toUpperCase()}
                </button>
              </div>
            </div>

            {/* DPI Configuration */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                TARGET DPI (DOTS PER INCH)
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[300, 200, 150].map((dpiVal) => (
                  <button
                    key={dpiVal}
                    className="btn-secondary"
                    onClick={() => onDpiChange(dpiVal)}
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      background: targetDpi === dpiVal ? 'rgba(0, 223, 216, 0.15)' : 'var(--bg-control)',
                      borderColor: targetDpi === dpiVal ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                      color: targetDpi === dpiVal ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                    }}
                  >
                    {dpiVal} DPI
                  </button>
                ))}
              </div>
            </div>

            {/* Live Computed Output Canvas Size */}
            <div
              style={{
                background: 'rgba(0, 223, 216, 0.05)',
                border: '1px solid rgba(0, 223, 216, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '4px' }}>
                EXACT EXPORT CANVAS DIMENSIONS
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color: '#FFF' }}>
                {computedPxW} × {computedPxH} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>pixels</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                pHYs metadata chunk: {Math.round(targetDpi / 0.0254)} pixels/meter
              </div>
            </div>

            {/* Quick Alignment Utilities */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                ALIGNMENT & CENTERING
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn-secondary" onClick={onCenterLayer} style={{ flex: 1, justifyContent: 'center' }}>
                  <AlignCenter size={14} />
                  <span>Center Artwork</span>
                </button>
                <button className="btn-secondary" onClick={onFitSafeMargin} style={{ flex: 1, justifyContent: 'center' }}>
                  <ArrowUpDown size={14} />
                  <span>Fit Safe Area</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LAYERS */}
        {activeTab === 'layers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              ARTWORK LAYERS ({layers.length})
            </div>
            {layers.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No artwork layers uploaded yet. Use the header Upload or AI Generate button.
              </div>
            ) : (
              layers.map((layer) => (
                <div
                  key={layer.id}
                  style={{
                    background: activeLayer?.id === layer.id ? 'rgba(0, 223, 216, 0.08)' : 'var(--bg-panel)',
                    border: activeLayer?.id === layer.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={layer.previewUrl}
                        alt="thumb"
                        style={{ width: '32px', height: '32px', objectFit: 'contain', background: '#000', borderRadius: '4px' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FFF' }}>{layer.name}</div>
                        <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {layer.originalWidth}x{layer.originalHeight}px • {layer.width}"×{layer.height}"
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={() => onUpdateLayer({ visible: !layer.visible })}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                      >
                        {layer.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                      <button
                        onClick={() => onUpdateLayer({ locked: !layer.locked })}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                      >
                        {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                      <button
                        onClick={() => onDeleteLayer(layer.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-pink)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Opacity slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                      <span>Opacity</span>
                      <span>{Math.round(layer.opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={layer.opacity}
                      onChange={(e) => onUpdateLayer({ opacity: parseFloat(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: ENHANCE */}
        {activeTab === 'enhance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Background Removal Section */}
            <div
              style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Wand2 size={16} color="var(--accent-cyan)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFF' }}>BACKGROUND REMOVAL</span>
              </div>

              {/* Auto-Detection Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '5px 8px',
                  marginBottom: '10px',
                }}
              >
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>AUTO-DETECTION</span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background:
                      detectedBgMode === 'graphic'
                        ? 'rgba(0, 223, 216, 0.15)'
                        : 'rgba(121, 40, 202, 0.15)',
                    color:
                      detectedBgMode === 'graphic'
                        ? 'var(--accent-cyan)'
                        : 'var(--accent-purple)',
                    border:
                      detectedBgMode === 'graphic'
                        ? '1px solid rgba(0, 223, 216, 0.3)'
                        : '1px solid rgba(121, 40, 202, 0.3)',
                  }}
                >
                  {detectedBgMode === 'graphic'
                    ? `FLAT GRAPHIC ${estimatedBgHex ? `(${estimatedBgHex})` : ''}`
                    : detectedBgMode === 'photo'
                    ? 'PHOTO / SUBJECT (AI)'
                    : 'ANALYZING...'}
                </span>
              </div>

              {/* Mode Segmented Selector */}
              <div
                style={{
                  display: 'flex',
                  gap: '3px',
                  background: 'rgba(0, 0, 0, 0.35)',
                  padding: '3px',
                  borderRadius: '6px',
                  marginBottom: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedBgMode('auto')}
                  style={{
                    flex: 1,
                    padding: '5px 4px',
                    fontSize: '0.70rem',
                    fontWeight: selectedBgMode === 'auto' ? 700 : 500,
                    background: selectedBgMode === 'auto' ? 'var(--bg-card)' : 'transparent',
                    color: selectedBgMode === 'auto' ? '#FFF' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBgMode('graphic')}
                  style={{
                    flex: 1.4,
                    padding: '5px 4px',
                    fontSize: '0.70rem',
                    fontWeight: selectedBgMode === 'graphic' ? 700 : 500,
                    background: selectedBgMode === 'graphic' ? 'var(--bg-card)' : 'transparent',
                    color: selectedBgMode === 'graphic' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Graphic (Colour-Key)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBgMode('photo')}
                  style={{
                    flex: 1.4,
                    padding: '5px 4px',
                    fontSize: '0.70rem',
                    fontWeight: selectedBgMode === 'photo' ? 700 : 500,
                    background: selectedBgMode === 'photo' ? 'var(--bg-card)' : 'transparent',
                    color: selectedBgMode === 'photo' ? 'var(--accent-purple)' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Photo/Subject (AI)
                </button>
              </div>

              {/* Mode Specific Description & Controls */}
              {((selectedBgMode === 'auto' && (detectedBgMode === 'graphic' || !detectedBgMode)) ||
                selectedBgMode === 'graphic') ? (
                <div style={{ marginBottom: '10px' }}>
                  <p style={{ fontSize: '0.70rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '8px' }}>
                    Deterministic color-key at full resolution. Small lettering, enclosed text, and linework survive 100% with zero gray edge halos.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Tolerance:</span>
                    <input
                      type="range"
                      min="4"
                      max="35"
                      value={bgTolerance}
                      onChange={(e) => setBgTolerance(parseInt(e.target.value, 10))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: '0.70rem', fontFamily: 'var(--font-mono)' }}>{bgTolerance}</span>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '10px' }}>
                  <p style={{ fontSize: '0.70rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '8px' }}>
                    Neural salient object segmentation (u2net / BiRefNet) with bounding-box safety union.
                  </p>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      color: preserveFineDetail ? '#FFF' : 'var(--text-muted)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={preserveFineDetail}
                      onChange={(e) => setPreserveFineDetail(e.target.checked)}
                    />
                    <span>Preserve fine detail / text (Safety Net)</span>
                  </label>
                </div>
              )}

              {bgRemovalError && (
                <div
                  style={{
                    background: 'rgba(255, 51, 102, 0.12)',
                    border: '1px solid rgba(255, 51, 102, 0.35)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 10px',
                    marginBottom: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#FFA0B4' }}>
                    <AlertTriangle size={13} color="var(--accent-pink)" />
                    <span>{bgRemovalError}</span>
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() =>
                      onRunRemoveBg({
                        mode: selectedBgMode,
                        preserveFineDetail,
                        tolerance: bgTolerance,
                      })
                    }
                    style={{ fontSize: '0.72rem', padding: '4px 8px', justifyContent: 'center' }}
                  >
                    <span>Retry Background Removal</span>
                  </button>
                </div>
              )}

              <button
                className="btn-primary"
                onClick={() =>
                  onRunRemoveBg({
                    mode: selectedBgMode,
                    preserveFineDetail,
                    tolerance: bgTolerance,
                  })
                }
                disabled={!activeLayer || isRemovingBg}
                style={{ width: '100%' }}
              >
                {isRemovingBg ? (
                  <>
                    <span className="animate-spin">◌</span>
                    <span>Processing Cutout...</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={14} />
                    <span>
                      {selectedBgMode === 'graphic' ||
                      (selectedBgMode === 'auto' && detectedBgMode === 'graphic')
                        ? 'Remove Background (Graphic Key)'
                        : 'Remove Background (Photo AI)'}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Upscaling Section */}
            <div
              style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Sparkles size={16} color="var(--accent-purple)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFF' }}>UPSCALE RESOLUTION</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '10px' }}>
                Lanczos3 resampling with edge sharpening. Real detail baseline is tracked immutably.
              </p>
              <div style={{ display: 'flex', gap: '6px' }}>
                {([2, 4, 8] as const).map((scale) => (
                  <button
                    key={scale}
                    className="btn-secondary"
                    onClick={() => onRunUpscale(scale)}
                    disabled={!activeLayer || isUpscaling}
                    style={{ flex: 1, justifyContent: 'center', fontFamily: 'var(--font-mono)' }}
                  >
                    {isUpscaling ? '...' : `${scale}x Upscale`}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>
                Notice: Resampling increases pixel dimensions without hallucinating artificial details.
              </div>
            </div>

            {/* Defringe / Edge Choke */}
            <div
              style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Sliders size={16} color="var(--accent-amber)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFF' }}>EDGE DEFRINGE & CLEANUP</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '10px' }}>
                Eliminate halo fringes and near-invisible ghost pixels that cause white underbase dirt on black shirts.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Choke:</span>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="1"
                  value={defringeChoke}
                  onChange={(e) => setDefringeChoke(parseInt(e.target.value, 10))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>{defringeChoke}px</span>
              </div>
              <button
                className="btn-secondary"
                onClick={() => onRunDefringe(defringeChoke)}
                disabled={!activeLayer || isDefringing}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {isDefringing ? 'Cleaning...' : 'Apply Edge Defringe'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT / VALIDATE */}
        {activeTab === 'validate' && validation && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background:
                  validation.status === 'ready'
                    ? 'rgba(0, 230, 118, 0.1)'
                    : validation.status === 'ready_with_warnings'
                    ? 'rgba(245, 166, 35, 0.1)'
                    : 'rgba(255, 51, 102, 0.1)',
                border: `1px solid ${
                  validation.status === 'ready'
                    ? 'rgba(0, 230, 118, 0.3)'
                    : validation.status === 'ready_with_warnings'
                    ? 'rgba(245, 166, 35, 0.3)'
                    : 'rgba(255, 51, 102, 0.3)'
                }`,
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {validation.status === 'ready' && <CheckCircle2 size={16} color="var(--status-ready)" />}
                {validation.status === 'ready_with_warnings' && <AlertTriangle size={16} color="var(--status-warning)" />}
                {(validation.status === 'needs_upscale' || validation.status === 'check_dimensions') && (
                  <ShieldAlert size={16} color="var(--status-error)" />
                )}
                <span>{validation.statusLabel.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Effective Print DPI: <strong style={{ color: '#FFF' }}>{validation.metrics.effectiveDpi} DPI</strong> (Qikink min: 150)
              </div>
            </div>

            {/* Real detail vs Placed dimensions */}
            <div style={{ background: 'var(--bg-panel)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>METRICS BREAKDOWN</div>
              <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Placed Size:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#FFF' }}>{validation.metrics.placedWidthIn}" × {validation.metrics.placedHeightIn}"</span>
              </div>
              <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Effective Resolution:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: validation.metrics.effectiveDpi >= 300 ? 'var(--status-ready)' : 'var(--status-warning)' }}>
                  {validation.metrics.effectiveDpi} DPI
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Real Detail Baseline:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#FFF' }}>{validation.metrics.realDetailDpi} DPI</span>
              </div>
            </div>

            {/* Errors */}
            {validation.errors.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-pink)', fontWeight: 700 }}>BLOCKING ERRORS</div>
                {validation.errors.map((err, i) => (
                  <div key={i} style={{ fontSize: '0.73rem', color: '#FFA0B4', background: 'rgba(255, 51, 102, 0.08)', padding: '8px', borderRadius: '4px' }}>
                    • {err}
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-amber)', fontWeight: 700 }}>PRODUCTION WARNINGS</div>
                {validation.warnings.map((warn, i) => (
                  <div key={i} style={{ fontSize: '0.73rem', color: '#FFE0A0', background: 'rgba(245, 166, 35, 0.08)', padding: '8px', borderRadius: '4px' }}>
                    • {warn}
                  </div>
                ))}
              </div>
            )}

            {/* Disclaimer */}
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: '1.4', fontStyle: 'italic', padding: '8px', borderLeft: '2px solid var(--border-subtle)' }}>
              {validation.disclaimer}
            </div>
          </div>
        )}

        {/* TAB 5: EXPORT */}
        {activeTab === 'export' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                EXPORT FORMAT
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['PNG', 'JPEG'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    className="btn-secondary"
                    onClick={() => setExportFormat(fmt)}
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      background: exportFormat === fmt ? 'rgba(0, 223, 216, 0.15)' : 'var(--bg-control)',
                      borderColor: exportFormat === fmt ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                      color: exportFormat === fmt ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                    }}
                  >
                    {fmt} {fmt === 'PNG' ? '(Transparent)' : '(Solid BG)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Trim option per Qikink guidelines */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="trimEdges"
                checked={trimEdges}
                onChange={(e) => setTrimEdges(e.target.checked)}
              />
              <label htmlFor="trimEdges" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Trim empty transparent borders (Qikink recommendation)
              </label>
            </div>

            {/* Specifications Summary */}
            <div style={{ background: 'var(--bg-panel)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>EXPORT SPECIFICATION</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                • Dimensions: <strong style={{ color: '#FFF' }}>{computedPxW} × {computedPxH} px</strong><br />
                • Resolution: <strong style={{ color: '#FFF' }}>{targetDpi} DPI</strong> (pHYs metadata written)<br />
                • Color Mode: <strong style={{ color: '#FFF' }}>Truecolor RGBA (Type 6, 8-bit)</strong><br />
                • Garment: <strong>{selectedProduct.name} ({selectedPlacement.name})</strong>
              </div>
            </div>

            {/* Big Export Action Button */}
            <button
              className="btn-primary"
              disabled={!activeLayer || (validation && !validation.canExport) || isExporting}
              onClick={() => onExportClick(exportFormat, trimEdges)}
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            >
              {isExporting ? (
                <>
                  <span className="animate-spin">◌</span>
                  <span>Rendering & Auditing Export...</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>Export Print-Ready {exportFormat}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
