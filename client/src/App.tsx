import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layer,
  ProductPreset,
  GarmentPlacement,
  ProjectVersion,
  ValidationReport,
  VerificationReport,
  EditorTool,
} from './types';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { CanvasArea } from './components/CanvasArea';
import { Sidebar } from './components/Sidebar';
import { BottomPanel } from './components/BottomPanel';
import { GenerateModal } from './components/GenerateModal';
import { CompareModal } from './components/CompareModal';
import { ExportModal } from './components/ExportModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import qikinkPresets from './presets/qikink.json';

const initialProducts = qikinkPresets.products as unknown as ProductPreset[];
const initialProduct = initialProducts[0] || null;
const initialPlacement = initialProduct?.placements?.[0] || null;
const initialColorHex = initialProduct?.garmentColors?.[0]?.hex || '#111111';

export const App: React.FC = () => {
  const [products, setProducts] = useState<ProductPreset[]>(initialProducts);
  const [selectedProduct, setSelectedProduct] = useState<ProductPreset | null>(initialProduct);
  const [selectedPlacement, setSelectedPlacement] = useState<GarmentPlacement | null>(initialPlacement);
  const [targetDpi, setTargetDpi] = useState<number>(300);

  // Layers & Versions
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<string>('');

  // Undo / Redo History
  const [history, setHistory] = useState<Layer[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Canvas View State
  const [currentTool, setCurrentTool] = useState<EditorTool>('select');
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showMockup, setShowMockup] = useState<boolean>(true);
  const [selectedColorHex, setSelectedColorHex] = useState<string>(initialColorHex);

  // Async States
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [isRemovingBg, setIsRemovingBg] = useState<boolean>(false);
  const [bgRemovalError, setBgRemovalError] = useState<string | null>(null);
  const [detectedBgMode, setDetectedBgMode] = useState<'graphic' | 'photo' | null>(null);
  const [estimatedBgHex, setEstimatedBgHex] = useState<string | null>(null);
  const [isUpscaling, setIsUpscaling] = useState<boolean>(false);
  const [isDefringing, setIsDefringing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Modals
  const [isGenerateOpen, setIsGenerateOpen] = useState<boolean>(false);
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [exportModalState, setExportModalState] = useState<{
    isOpen: boolean;
    report: VerificationReport | null;
    downloadUrl: string | null;
    filename: string;
  }>({
    isOpen: false,
    report: null,
    downloadUrl: null,
    filename: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Initial Load: Presets
  useEffect(() => {
    fetch('/api/presets')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.products && data.products.length > 0) {
          setProducts(data.products);
          const defaultProd = data.products[0];
          setSelectedProduct(defaultProd);
          setSelectedPlacement(defaultProd.placements[0]);
          if (defaultProd.garmentColors?.length > 0) {
            setSelectedColorHex(defaultProd.garmentColors[0].hex);
          }
        }
      })
      .catch((err) => console.error('Failed to load presets:', err));
  }, []);

  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0] || null;

  // 2. Push history for Undo/Redo
  const pushHistory = useCallback(
    (newLayers: Layer[]) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, newLayers];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevLayers = history[historyIndex - 1];
      setLayers(prevLayers);
      setHistoryIndex(historyIndex - 1);
      const match = versions.find((v) => v.fileId === prevLayers[0]?.fileId);
      if (match) {
        setCurrentVersionId(match.id);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextLayers = history[historyIndex + 1];
      setLayers(nextLayers);
      setHistoryIndex(historyIndex + 1);
      const match = versions.find((v) => v.fileId === nextLayers[0]?.fileId);
      if (match) {
        setCurrentVersionId(match.id);
      }
    }
  };

  // 3. Layer Updates
  const handleUpdateLayer = (updated: Partial<Layer>) => {
    if (!activeLayer) return;
    const newLayers = layers.map((l) => (l.id === activeLayer.id ? { ...l, ...updated } : l));
    setLayers(newLayers);
  };

  const handleDeleteLayer = (id: string) => {
    const remaining = layers.filter((l) => l.id !== id);
    setLayers(remaining);
    if (activeLayerId === id) {
      setActiveLayerId(remaining[0]?.id || null);
    }
    pushHistory(remaining);
  };

  // 4. File Upload Handler
  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      // Calculate initial physical placement (default 10 inches wide or fit within print area)
      const maxW = selectedPlacement ? selectedPlacement.printWidthIn - 1.0 : 10;
      const maxH = selectedPlacement ? selectedPlacement.printHeightIn - 1.0 : 12;
      const aspect = data.metadata.width / data.metadata.height;

      let initW = Math.min(10, maxW);
      let initH = initW / aspect;
      if (initH > maxH) {
        initH = maxH;
        initW = initH * aspect;
      }

      const initX = selectedPlacement ? (selectedPlacement.printWidthIn - initW) / 2 : 1;
      const initY = selectedPlacement ? (selectedPlacement.printHeightIn - initH) / 2 : 1;

      const newLayer: Layer = {
        id: crypto.randomUUID(),
        fileId: data.fileId,
        name: file.name,
        x: Math.round(initX * 100) / 100,
        y: Math.round(initY * 100) / 100,
        width: Math.round(initW * 100) / 100,
        height: Math.round(initH * 100) / 100,
        rotation: 0,
        opacity: 1.0,
        visible: true,
        locked: false,
        originalWidth: data.metadata.width,
        originalHeight: data.metadata.height,
        hasAlpha: data.metadata.hasAlpha,
        previewUrl: data.url,
      };

      const newVersion: ProjectVersion = {
        id: crypto.randomUUID(),
        versionNumber: versions.length + 1,
        label: 'Original Upload',
        fileId: data.fileId,
        previewUrl: data.url,
        provenance: {
          type: 'original',
          label: 'Original Upload',
          timestamp: new Date().toISOString(),
        },
        originalPixels: {
          width: data.metadata.width,
          height: data.metadata.height,
        },
        width: data.metadata.width,
        height: data.metadata.height,
        hasAlpha: data.metadata.hasAlpha,
      };

      setLayers([newLayer]);
      setActiveLayerId(newLayer.id);
      setVersions([newVersion]);
      setCurrentVersionId(newVersion.id);
      pushHistory([newLayer]);
    } catch (err: any) {
      alert(err.message || 'Error uploading artwork');
    }
  };

  // 5. Live Print Validation Trigger
  useEffect(() => {
    if (!selectedPlacement || !activeLayer) {
      setValidation(null);
      return;
    }

    const canvasW = Math.round(selectedPlacement.printWidthIn * targetDpi);
    const canvasH = Math.round(selectedPlacement.printHeightIn * targetDpi);

    const artPlacedX = Math.round(activeLayer.x * targetDpi);
    const artPlacedY = Math.round(activeLayer.y * targetDpi);
    const artPlacedW = Math.round(activeLayer.width * targetDpi);
    const artPlacedH = Math.round(activeLayer.height * targetDpi);

    const body = {
      printWidthIn: selectedPlacement.printWidthIn,
      printHeightIn: selectedPlacement.printHeightIn,
      dpi: targetDpi,
      exportFormat: 'PNG',
      safeMarginIn: selectedPlacement.safeMarginIn,
      artwork: {
        sourceWidthPx: activeLayer.originalWidth,
        sourceHeightPx: activeLayer.originalHeight,
        originalWidthPx: activeLayer.originalWidth,
        originalHeightPx: activeLayer.originalHeight,
        placedX: artPlacedX,
        placedY: artPlacedY,
        placedWidthPx: artPlacedW,
        placedHeightPx: artPlacedH,
        hasAlpha: activeLayer.hasAlpha,
      },
    };

    fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then((result) => setValidation(result))
      .catch((err) => console.error('Validation fetch error:', err));
  }, [selectedPlacement, activeLayer, targetDpi]);

  // 5b. Auto-detect Artwork Nature (Graphic vs Photo)
  useEffect(() => {
    if (!activeLayer) {
      setDetectedBgMode(null);
      setEstimatedBgHex(null);
      return;
    }
    fetch('/api/detect-bg-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: activeLayer.fileId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.mode) {
          setDetectedBgMode(data.mode);
          setEstimatedBgHex(data.estimatedBgHex);
        }
      })
      .catch((err) => console.error('Detect mode fetch error:', err));
  }, [activeLayer?.fileId]);

  // 6. Background Removal Action
  const handleRunRemoveBg = async (options?: {
    mode?: 'auto' | 'graphic' | 'photo';
    preserveFineDetail?: boolean;
    tolerance?: number;
  }) => {
    if (!activeLayer) return;
    setIsRemovingBg(true);
    setBgRemovalError(null);
    try {
      const res = await fetch('/api/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: activeLayer.fileId,
          mode: options?.mode || 'auto',
          preserveFineDetail: options?.preserveFineDetail ?? true,
          tolerance: options?.tolerance,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'BG Removal failed');

      const updatedLayer: Layer = {
        ...activeLayer,
        fileId: data.fileId,
        previewUrl: data.url,
        hasAlpha: true,
      };

      const provLabel =
        data.effectiveMode === 'graphic'
          ? 'Graphic Colour-Key (Zero Grey Halo, 100% Detail Preserved)'
          : data.restoredPixelsCount && data.restoredPixelsCount > 0
          ? `Photo AI + Detail Safety Net (${data.restoredPixelsCount}px protected)`
          : 'Photo AI Matting (u2net / BiRefNet)';

      const newVersion: ProjectVersion = {
        id: crypto.randomUUID(),
        versionNumber: versions.length + 1,
        label: data.effectiveMode === 'graphic' ? 'Graphic Cutout' : 'AI Cutout',
        fileId: data.fileId,
        previewUrl: data.url,
        provenance: {
          type: 'bg-removed',
          label: provLabel,
          timestamp: new Date().toISOString(),
        },
        originalPixels: {
          width: activeLayer.originalWidth,
          height: activeLayer.originalHeight,
        },
        width: data.width,
        height: data.height,
        hasAlpha: true,
      };

      const newLayers = layers.map((l) => (l.id === activeLayer.id ? updatedLayer : l));
      setLayers(newLayers);
      setVersions((prev) => [...prev, newVersion]);
      setCurrentVersionId(newVersion.id);
      pushHistory(newLayers);
    } catch (err: any) {
      setBgRemovalError(err.message || 'Background removal error');
    } finally {
      setIsRemovingBg(false);
    }
  };

  // 7. Upscale Action
  const handleRunUpscale = async (scale: 2 | 4 | 8) => {
    if (!activeLayer) return;
    setIsUpscaling(true);
    try {
      const res = await fetch('/api/upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: activeLayer.fileId, scale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upscaling failed');

      const updatedLayer: Layer = {
        ...activeLayer,
        fileId: data.fileId,
        previewUrl: data.url,
        originalWidth: data.width,
        originalHeight: data.height,
      };

      const newVersion: ProjectVersion = {
        id: crypto.randomUUID(),
        versionNumber: versions.length + 1,
        label: `${scale}x Upscaled`,
        fileId: data.fileId,
        previewUrl: data.url,
        provenance: {
          type: 'resampled',
          label: data.provenanceLabel,
          timestamp: new Date().toISOString(),
        },
        originalPixels: {
          width: activeLayer.originalWidth,
          height: activeLayer.originalHeight,
        },
        width: data.width,
        height: data.height,
        hasAlpha: activeLayer.hasAlpha,
      };

      const newLayers = layers.map((l) => (l.id === activeLayer.id ? updatedLayer : l));
      setLayers(newLayers);
      setVersions((prev) => [...prev, newVersion]);
      setCurrentVersionId(newVersion.id);
      pushHistory(newLayers);
    } catch (err: any) {
      alert(err.message || 'Upscaling error');
    } finally {
      setIsUpscaling(false);
    }
  };

  // 8. Defringe Action
  const handleRunDefringe = async (chokePx: number) => {
    if (!activeLayer) return;
    setIsDefringing(true);
    try {
      const res = await fetch('/api/defringe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: activeLayer.fileId, chokePx }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Defringe failed');

      const updatedLayer: Layer = {
        ...activeLayer,
        fileId: data.fileId,
        previewUrl: data.url,
      };

      const newVersion: ProjectVersion = {
        id: crypto.randomUUID(),
        versionNumber: versions.length + 1,
        label: 'Edge Defringed',
        fileId: data.fileId,
        previewUrl: data.url,
        provenance: {
          type: 'defringed',
          label: `Edge Defringe & Alpha Choke (${chokePx}px)`,
          timestamp: new Date().toISOString(),
        },
        originalPixels: {
          width: activeLayer.originalWidth,
          height: activeLayer.originalHeight,
        },
        width: activeLayer.originalWidth,
        height: activeLayer.originalHeight,
        hasAlpha: true,
      };

      const newLayers = layers.map((l) => (l.id === activeLayer.id ? updatedLayer : l));
      setLayers(newLayers);
      setVersions((prev) => [...prev, newVersion]);
      setCurrentVersionId(newVersion.id);
      pushHistory(newLayers);
    } catch (err: any) {
      alert(err.message || 'Defringe error');
    } finally {
      setIsDefringing(false);
    }
  };

  // 9. Export Action
  const handleExportClick = async (format: 'PNG' | 'JPEG', trimEdges: boolean) => {
    if (!selectedPlacement || layers.length === 0) return;
    setIsExporting(true);
    try {
      // Map layers to canvas target pixel coordinates
      const renderedLayers = layers
        .filter((l) => l.visible)
        .map((l) => ({
          fileId: l.fileId,
          x: Math.round(l.x * targetDpi),
          y: Math.round(l.y * targetDpi),
          width: Math.round(l.width * targetDpi),
          height: Math.round(l.height * targetDpi),
          rotationDeg: l.rotation,
          opacity: l.opacity,
        }));

      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printWidthIn: selectedPlacement.printWidthIn,
          printHeightIn: selectedPlacement.printHeightIn,
          dpi: targetDpi,
          format,
          layers: renderedLayers,
          trimTransparentEdges: trimEdges,
          filename: `zenith-${selectedPlacement.id}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Export failed');

      setExportModalState({
        isOpen: true,
        report: data.verificationReport,
        downloadUrl: data.downloadUrl,
        filename: data.filename,
      });
    } catch (err: any) {
      alert(err.message || 'Export error');
    } finally {
      setIsExporting(false);
    }
  };

  // 10. Center and Fit Alignments
  const handleCenterLayer = () => {
    if (!activeLayer || !selectedPlacement) return;
    const newX = (selectedPlacement.printWidthIn - activeLayer.width) / 2;
    const newY = (selectedPlacement.printHeightIn - activeLayer.height) / 2;
    handleUpdateLayer({
      x: Math.round(newX * 100) / 100,
      y: Math.round(newY * 100) / 100,
    });
  };

  const handleFitSafeMargin = () => {
    if (!activeLayer || !selectedPlacement) return;
    const safeW = selectedPlacement.printWidthIn - selectedPlacement.safeMarginIn * 2;
    const safeH = selectedPlacement.printHeightIn - selectedPlacement.safeMarginIn * 2;
    const aspect = activeLayer.width / activeLayer.height;

    let targetW = safeW;
    let targetH = targetW / aspect;
    if (targetH > safeH) {
      targetH = safeH;
      targetW = targetH * aspect;
    }

    const newX = (selectedPlacement.printWidthIn - targetW) / 2;
    const newY = (selectedPlacement.printHeightIn - targetH) / 2;

    handleUpdateLayer({
      width: Math.round(targetW * 100) / 100,
      height: Math.round(targetH * 100) / 100,
      x: Math.round(newX * 100) / 100,
      y: Math.round(newY * 100) / 100,
    });
  };

  // 11. Select Version from Timeline
  const handleSelectVersion = (v: ProjectVersion) => {
    setCurrentVersionId(v.id);
    if (activeLayer) {
      const updated = {
        ...activeLayer,
        fileId: v.fileId,
        previewUrl: v.previewUrl,
        originalWidth: v.width,
        originalHeight: v.height,
        hasAlpha: v.hasAlpha,
      };
      const newLayers = layers.map((l) => (l.id === activeLayer.id ? updated : l));
      setLayers(newLayers);
      pushHistory(newLayers);
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleExportClick('PNG', false);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setIsGenerateOpen(true);
      } else if (e.key.toLowerCase() === 'v') setCurrentTool('select');
      else if (e.key.toLowerCase() === 'h') setCurrentTool('hand');
      else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(16, z * 1.25));
      else if (e.key === '-' || e.key === '_') setZoom((z) => Math.max(0.2, z / 1.25));
      else if (e.key === '0') {
        setZoom(1.0);
        setPan({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [layers, historyIndex]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        background: 'var(--bg-app)',
        overflow: 'hidden',
      }}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
        accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
      />

      {/* Header */}
      <Header
        onOpenGenerate={() => setIsGenerateOpen(true)}
        onUploadClick={() => fileInputRef.current?.click()}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        validation={validation}
        projectName={selectedPlacement ? `${selectedProduct?.name} - ${selectedPlacement.name}` : 'New Project'}
        isPresetVerified={Boolean(selectedPlacement?.provenance?.verified)}
      />

      {/* Main Studio Middle (Toolbar + Canvas + Sidebar) */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        <Toolbar
          currentTool={currentTool}
          onSelectTool={setCurrentTool}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
          zoomPercent={zoom * 100}
          onZoomIn={() => setZoom((z) => Math.min(16, z * 1.25))}
          onZoomOut={() => setZoom((z) => Math.max(0.2, z / 1.25))}
          onResetZoom={() => {
            setZoom(1.0);
            setPan({ x: 0, y: 0 });
          }}
        />

        {selectedPlacement ? (
          <CanvasArea
            currentPlacement={selectedPlacement}
            activeLayer={activeLayer}
            onUpdateLayer={handleUpdateLayer}
            currentTool={currentTool}
            zoom={zoom}
            pan={pan}
            onPanChange={setPan}
            showMockup={showMockup}
            onToggleMockup={() => setShowMockup(!showMockup)}
            garmentColors={selectedProduct?.garmentColors || []}
            selectedColorHex={selectedColorHex}
            onSelectColor={setSelectedColorHex}
            targetDpi={targetDpi}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Loading studio presets...
          </div>
        )}

        {selectedProduct && selectedPlacement && (
          <Sidebar
            products={products}
            selectedProduct={selectedProduct}
            onSelectProduct={setSelectedProduct}
            selectedPlacement={selectedPlacement}
            onSelectPlacement={setSelectedPlacement}
            targetDpi={targetDpi}
            onDpiChange={setTargetDpi}
            layers={layers}
            activeLayer={activeLayer}
            onUpdateLayer={handleUpdateLayer}
            onDeleteLayer={handleDeleteLayer}
            validation={validation}
            onRunRemoveBg={handleRunRemoveBg}
            isRemovingBg={isRemovingBg}
            bgRemovalError={bgRemovalError}
            detectedBgMode={detectedBgMode}
            estimatedBgHex={estimatedBgHex}
            onRunUpscale={handleRunUpscale}
            isUpscaling={isUpscaling}
            onRunDefringe={handleRunDefringe}
            isDefringing={isDefringing}
            onExportClick={handleExportClick}
            isExporting={isExporting}
            onCenterLayer={handleCenterLayer}
            onFitSafeMargin={handleFitSafeMargin}
          />
        )}
      </div>

      {/* Bottom Panel (Version Timeline & Compare Button) */}
      <BottomPanel
        versions={versions}
        currentVersionId={currentVersionId}
        onSelectVersion={handleSelectVersion}
        onOpenCompare={() => setIsCompareOpen(true)}
      />

      {/* Modals */}
      <GenerateModal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        onSelectCandidate={(url, fileId, w, h) => {
          const newLayer: Layer = {
            id: crypto.randomUUID(),
            fileId,
            name: 'AI Streetwear Graphic',
            x: 1.0,
            y: 1.0,
            width: 10.0,
            height: 10.0,
            rotation: 0,
            opacity: 1.0,
            visible: true,
            locked: false,
            originalWidth: w,
            originalHeight: h,
            hasAlpha: true,
            previewUrl: url,
          };
          const newVersion: ProjectVersion = {
            id: crypto.randomUUID(),
            versionNumber: versions.length + 1,
            label: 'AI Generated',
            fileId,
            previewUrl: url,
            provenance: {
              type: 'original',
              label: 'AI Generated Graphic',
              timestamp: new Date().toISOString(),
            },
            originalPixels: { width: w, height: h },
            width: w,
            height: h,
            hasAlpha: true,
          };
          setLayers([newLayer]);
          setActiveLayerId(newLayer.id);
          setVersions([newVersion]);
          setCurrentVersionId(newVersion.id);
          pushHistory([newLayer]);
        }}
      />

      <CompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        versions={versions}
      />

      <ExportModal
        isOpen={exportModalState.isOpen}
        onClose={() => setExportModalState({ ...exportModalState, isOpen: false })}
        report={exportModalState.report}
        downloadUrl={exportModalState.downloadUrl}
        filename={exportModalState.filename}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
};

export default App;
