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
  X,
  Palette,
  RotateCcw,
} from 'lucide-react';
import { RECOLOR_PALETTE } from '../utils/recolor';

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
  onApplyColorOverlay?: (colorHex: string) => void;
  onResetArtworkColor?: () => void;
  isRecoloring?: boolean;
  onExportClick: (format: 'PNG' | 'JPEG', trimEdges: boolean) => void;
  isExporting: boolean;
  onCenterLayer: () => void;
  onFitSafeMargin: () => void;
  isMobile?: boolean;
  activeTab?: 'placement' | 'layers' | 'enhance' | 'validate' | 'export';
  onTabChange?: (tab: 'placement' | 'layers' | 'enhance' | 'validate' | 'export') => void;
  onCloseMobileDrawer?: () => void;
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
  onApplyColorOverlay,
  onResetArtworkColor,
  isRecoloring = false,
  onExportClick,
  isExporting,
  onCenterLayer,
  onFitSafeMargin,
  isMobile = false,
  activeTab: externalActiveTab,
  onTabChange,
  onCloseMobileDrawer,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<'placement' | 'layers' | 'enhance' | 'validate' | 'export'>('placement');
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const setActiveTab = (tab: 'placement' | 'layers' | 'enhance' | 'validate' | 'export') => {
    setInternalActiveTab(tab);
    onTabChange?.(tab);
  };
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [exportFormat, setExportFormat] = useState<'PNG' | 'JPEG'>('PNG');
  const [trimEdges, setTrimEdges] = useState(false);
  const [defringeChoke, setDefringeChoke] = useState(1);
  const [selectedBgMode, setSelectedBgMode] = useState<'auto' | 'graphic' | 'photo'>('auto');
  const [preserveFineDetail, setPreserveFineDetail] = useState(true);
  const [bgTolerance, setBgTolerance] = useState(14);
  const [customColorHex, setCustomColorHex] = useState('#000000');

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
      className={isMobile ? '' : 'desktop-only'}
      style={{
        width: isMobile ? '100%' : '360px',
        background: 'var(--bg-studio)',
        borderLeft: isMobile ? 'none' : '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: isMobile ? '82dvh' : '100%',
        zIndex: 40,
        overflow: 'hidden',
      }}
    >
      {/* Mobile Drawer Grab Handle & Header */}
      {isMobile && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '8px 16px 6px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-panel)',
            flexShrink: 0,
          }}
        >
          <div className="mobile-drawer-handle-bar" onClick={onCloseMobileDrawer} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '4px' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              Studio Controls & Tools
            </span>
            {onCloseMobileDrawer && (
              <button
                onClick={onCloseMobileDrawer}
                aria-label="Close drawer"
                style={{
                  border: 'none',
                  background: 'var(--bg-control)',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sidebar Nav Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-panel)',
          flexShrink: 0,
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
                padding: isMobile ? '8px 2px' : '12px 4px',
                background: isActive ? 'var(--bg-studio)' : 'transparent',
                color: isActive ? 'var(--color-canva-violet)' : 'var(--color-slate-smoke)',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--color-canva-violet)' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: isMobile ? '0.70rem' : '0.74rem',
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={isMobile ? 15 : 16} />
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
                    color: 'var(--color-canva-violet)',
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
                      background: targetDpi === dpiVal ? 'rgba(139, 61, 255, 0.1)' : 'var(--bg-control)',
                      borderColor: targetDpi === dpiVal ? 'var(--color-canva-violet)' : 'var(--border-subtle)',
                      color: targetDpi === dpiVal ? 'var(--color-canva-violet)' : 'var(--text-secondary)',
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
                background: 'rgba(139, 61, 255, 0.04)',
                border: '1px solid rgba(139, 61, 255, 0.18)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--color-canva-violet)', fontWeight: 600, marginBottom: '4px' }}>
                EXACT EXPORT CANVAS DIMENSIONS
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
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
                    background: activeLayer?.id === layer.id ? 'rgba(139, 61, 255, 0.06)' : 'var(--bg-panel)',
                    border: activeLayer?.id === layer.id ? '1px solid var(--color-canva-violet)' : '1px solid var(--border-subtle)',
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
                        onError={(e) => {
                          if (layer.dataUrl && layer.previewUrl !== layer.dataUrl) {
                            (e.currentTarget as HTMLImageElement).src = layer.dataUrl;
                          }
                        }}
                        style={{ width: '32px', height: '32px', objectFit: 'contain', background: '#f8f9fa', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{layer.name}</div>
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
                <Wand2 size={16} color="var(--color-canva-violet)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>BACKGROUND REMOVAL</span>
              </div>

              {/* Auto-Detection Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-control)',
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
                        ? 'rgba(139, 61, 255, 0.1)'
                        : 'rgba(233, 80, 247, 0.1)',
                    color:
                      detectedBgMode === 'graphic'
                        ? 'var(--color-canva-violet)'
                        : 'var(--color-plasma-pink)',
                    border:
                      detectedBgMode === 'graphic'
                        ? '1px solid rgba(139, 61, 255, 0.25)'
                        : '1px solid rgba(233, 80, 247, 0.25)',
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
                  gap: '4px',
                  background: 'var(--bg-control)',
                  padding: '3px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '10px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedBgMode('auto')}
                  style={{
                    flex: 1,
                    padding: '5px 4px',
                    fontSize: '0.72rem',
                    fontWeight: selectedBgMode === 'auto' ? 600 : 500,
                    background: selectedBgMode === 'auto' ? '#ffffff' : 'transparent',
                    color: selectedBgMode === 'auto' ? 'var(--color-ink-black)' : 'var(--color-slate-smoke)',
                    boxShadow: selectedBgMode === 'auto' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
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
                    fontSize: '0.72rem',
                    fontWeight: selectedBgMode === 'graphic' ? 600 : 500,
                    background: selectedBgMode === 'graphic' ? '#ffffff' : 'transparent',
                    color: selectedBgMode === 'graphic' ? 'var(--color-canva-violet)' : 'var(--color-slate-smoke)',
                    boxShadow: selectedBgMode === 'graphic' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
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
                    fontSize: '0.72rem',
                    fontWeight: selectedBgMode === 'photo' ? 600 : 500,
                    background: selectedBgMode === 'photo' ? '#ffffff' : 'transparent',
                    color: selectedBgMode === 'photo' ? 'var(--color-plasma-pink)' : 'var(--color-slate-smoke)',
                    boxShadow: selectedBgMode === 'photo' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
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
                      color: preserveFineDetail ? 'var(--text-primary)' : 'var(--text-muted)',
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
                <Sparkles size={16} color="var(--color-canva-violet)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>UPSCALE RESOLUTION</span>
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
                <Sliders size={16} color="var(--color-solar-orange)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>EDGE DEFRINGE & CLEANUP</span>
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

            {/* Photoshop-style Color Overlay / Recolor Artwork */}
            <div
              style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Palette size={16} color="var(--color-canva-violet)" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    COLOR OVERLAY (PHOTOSHOP FILL)
                  </span>
                </div>
                {activeLayer?.colorOverlayHex && (
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontFamily: 'var(--font-mono)',
                      background: 'rgba(139, 61, 255, 0.1)',
                      color: 'var(--color-canva-violet)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                  >
                    Active: {activeLayer.colorOverlayHex.toUpperCase()}
                  </span>
                )}
              </div>

              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '12px' }}>
                Fill your graphic/text with any solid color (e.g. Paint Black or White). Preserves 100% transparent background and anti-aliased edge details.
              </p>

              {/* Quick Primary Actions: Paint Black / Paint White */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                  className="btn-secondary"
                  onClick={() => onApplyColorOverlay?.('#000000')}
                  disabled={!activeLayer || isRecoloring}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    background: '#0F1015',
                    color: '#FFFFFF',
                    border: '1px solid #000000',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                  }}
                  title="Recolor graphic to Pure Black (#000000)"
                >
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FFFFFF', marginRight: '6px' }} />
                  <span>{isRecoloring ? '...' : 'Paint Black'}</span>
                </button>

                <button
                  className="btn-secondary"
                  onClick={() => onApplyColorOverlay?.('#FFFFFF')}
                  disabled={!activeLayer || isRecoloring}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    background: '#FFFFFF',
                    color: '#0F1015',
                    border: '1.5px solid var(--border-strong)',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                    cursor: 'pointer',
                  }}
                  title="Recolor graphic to Pure White (#FFFFFF)"
                >
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0F1015', marginRight: '6px' }} />
                  <span>{isRecoloring ? '...' : 'Paint White'}</span>
                </button>
              </div>

              {/* Palette Swatches */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  POPULAR PRINT COLORS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                  {RECOLOR_PALETTE.slice(2).map((preset) => (
                    <button
                      key={preset.hex}
                      onClick={() => {
                        setCustomColorHex(preset.hex);
                        onApplyColorOverlay?.(preset.hex);
                      }}
                      disabled={!activeLayer || isRecoloring}
                      style={{
                        height: '28px',
                        borderRadius: '6px',
                        background: preset.hex,
                        border: activeLayer?.colorOverlayHex === preset.hex ? '2px solid var(--color-ink-black)' : '1px solid rgba(0,0,0,0.15)',
                        boxShadow: activeLayer?.colorOverlayHex === preset.hex ? '0 0 0 2px rgba(139, 61, 255, 0.4)' : 'none',
                        cursor: 'pointer',
                        transform: activeLayer?.colorOverlayHex === preset.hex ? 'scale(1.08)' : 'scale(1)',
                        transition: 'all 0.15s ease',
                      }}
                      title={`${preset.name} (${preset.hex})`}
                    />
                  ))}
                </div>
              </div>

              {/* Custom Color Picker & Reset */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, background: 'var(--bg-control)', padding: '4px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <input
                    type="color"
                    value={customColorHex}
                    onChange={(e) => setCustomColorHex(e.target.value)}
                    style={{ width: '24px', height: '24px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                  />
                  <input
                    type="text"
                    value={customColorHex}
                    onChange={(e) => setCustomColorHex(e.target.value)}
                    placeholder="#HEX"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.74rem',
                      width: '70px',
                      padding: 0,
                    }}
                  />
                  <button
                    className="btn-secondary"
                    onClick={() => onApplyColorOverlay?.(customColorHex)}
                    disabled={!activeLayer || isRecoloring}
                    style={{ fontSize: '0.70rem', padding: '3px 8px', marginLeft: 'auto' }}
                  >
                    Apply
                  </button>
                </div>

                {activeLayer?.colorOverlayHex && onResetArtworkColor && (
                  <button
                    className="btn-secondary"
                    onClick={onResetArtworkColor}
                    title="Reset to original uploaded artwork colors"
                    style={{ padding: '6px 8px', fontSize: '0.70rem' }}
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                )}
              </div>
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
                    ? 'rgba(0, 177, 0, 0.08)'
                    : validation.status === 'ready_with_warnings'
                    ? 'rgba(255, 97, 5, 0.08)'
                    : 'rgba(255, 61, 77, 0.08)',
                border: `1px solid ${
                  validation.status === 'ready'
                    ? 'rgba(0, 177, 0, 0.25)'
                    : validation.status === 'ready_with_warnings'
                    ? 'rgba(255, 97, 5, 0.25)'
                    : 'rgba(255, 61, 77, 0.25)'
                }`,
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {validation.status === 'ready' && <CheckCircle2 size={16} color="var(--status-ready)" />}
                {validation.status === 'ready_with_warnings' && <AlertTriangle size={16} color="var(--status-warning)" />}
                {(validation.status === 'needs_upscale' || validation.status === 'check_dimensions') && (
                  <ShieldAlert size={16} color="var(--status-error)" />
                )}
                <span>{validation.statusLabel.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Effective Print DPI: <strong style={{ color: 'var(--text-primary)' }}>{validation.metrics.effectiveDpi} DPI</strong> (Qikink min: 150)
              </div>
            </div>

            {/* Real detail vs Placed dimensions */}
            <div style={{ background: 'var(--bg-panel)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>METRICS BREAKDOWN</div>
              <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Placed Size:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{validation.metrics.placedWidthIn}" × {validation.metrics.placedHeightIn}"</span>
              </div>
              <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Effective Resolution:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: validation.metrics.effectiveDpi >= 300 ? 'var(--status-ready)' : 'var(--status-warning)' }}>
                  {validation.metrics.effectiveDpi} DPI
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Real Detail Baseline:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{validation.metrics.realDetailDpi} DPI</span>
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
                      background: exportFormat === fmt ? 'rgba(139, 61, 255, 0.1)' : '#ffffff',
                      borderColor: exportFormat === fmt ? 'var(--color-canva-violet)' : 'var(--border-strong)',
                      color: exportFormat === fmt ? 'var(--color-canva-violet)' : 'var(--color-slate-smoke)',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 600,
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
              <div style={{ fontSize: '0.76rem', color: 'var(--color-slate-smoke)', lineHeight: '1.6' }}>
                • Dimensions: <strong style={{ color: 'var(--color-ink-black)' }}>{computedPxW} × {computedPxH} px</strong><br />
                • Resolution: <strong style={{ color: 'var(--color-ink-black)' }}>{targetDpi} DPI</strong> (pHYs metadata written)<br />
                • Color Mode: <strong style={{ color: 'var(--color-ink-black)' }}>Truecolor RGBA (Type 6, 8-bit)</strong><br />
                • Garment: <strong style={{ color: 'var(--color-ink-black)' }}>{selectedProduct.name} ({selectedPlacement.name})</strong>
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
