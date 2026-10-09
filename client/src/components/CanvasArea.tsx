import React, { useRef, useState, useEffect } from 'react';
import { Layer, GarmentPlacement, GarmentColor, EditorTool } from '../types';
import { Shirt, Eye, EyeOff, ZoomIn, AlertCircle } from 'lucide-react';

interface CanvasAreaProps {
  currentPlacement: GarmentPlacement;
  activeLayer: Layer | null;
  onUpdateLayer: (updated: Partial<Layer>) => void;
  currentTool: EditorTool;
  zoom: number;
  pan: { x: number; y: number };
  onPanChange: (pan: { x: number; y: number }) => void;
  showMockup: boolean;
  onToggleMockup: () => void;
  garmentColors: GarmentColor[];
  selectedColorHex: string;
  onSelectColor: (hex: string) => void;
  targetDpi: number;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  currentPlacement,
  activeLayer,
  onUpdateLayer,
  currentTool,
  zoom,
  pan,
  onPanChange,
  showMockup,
  onToggleMockup,
  garmentColors,
  selectedColorHex,
  onSelectColor,
  targetDpi,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, layerX: 0, layerY: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({
    mouseX: 0,
    mouseY: 0,
    layerX: 0,
    layerY: 0,
    layerW: 0,
    layerH: 0,
    aspectRatio: 1,
  });

  // Screen scale factor: 1 inch = 32 CSS pixels at 100% zoom
  const INCH_TO_SCREEN_PX = 32;
  const canvasWidthPx = currentPlacement.printWidthIn * INCH_TO_SCREEN_PX;
  const canvasHeightPx = currentPlacement.printHeightIn * INCH_TO_SCREEN_PX;
  const safeMarginPx = currentPlacement.safeMarginIn * INCH_TO_SCREEN_PX;

  // Convert layer inches to screen coordinates
  const layerScreenX = activeLayer ? activeLayer.x * INCH_TO_SCREEN_PX : 0;
  const layerScreenY = activeLayer ? activeLayer.y * INCH_TO_SCREEN_PX : 0;
  const layerScreenW = activeLayer ? activeLayer.width * INCH_TO_SCREEN_PX : 0;
  const layerScreenH = activeLayer ? activeLayer.height * INCH_TO_SCREEN_PX : 0;

  // Pan interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    if (currentTool === 'hand' || e.button === 1) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      onPanChange({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    } else if (isDraggingLayer && activeLayer && !activeLayer.locked) {
      const deltaX = (e.clientX - dragStart.x) / (zoom * INCH_TO_SCREEN_PX);
      const deltaY = (e.clientY - dragStart.y) / (zoom * INCH_TO_SCREEN_PX);
      onUpdateLayer({
        x: Math.round((dragStart.layerX + deltaX) * 100) / 100,
        y: Math.round((dragStart.layerY + deltaY) * 100) / 100,
      });
    } else if (isResizing && activeLayer && !activeLayer.locked) {
      const deltaScreenX = (e.clientX - resizeStart.mouseX) / zoom;
      const deltaInches = deltaScreenX / INCH_TO_SCREEN_PX;
      let newW = Math.max(0.5, resizeStart.layerW + deltaInches);
      let newH = newW / resizeStart.aspectRatio;

      onUpdateLayer({
        width: Math.round(newW * 100) / 100,
        height: Math.round(newH * 100) / 100,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDraggingLayer(false);
    setIsResizing(false);
  };

  const handleLayerMouseDown = (e: React.MouseEvent) => {
    if (currentTool === 'select' && activeLayer && !activeLayer.locked) {
      e.stopPropagation();
      setIsDraggingLayer(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        layerX: activeLayer.x,
        layerY: activeLayer.y,
      });
    }
  };

  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    if (!activeLayer || activeLayer.locked) return;
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      layerX: activeLayer.x,
      layerY: activeLayer.y,
      layerW: activeLayer.width,
      layerH: activeLayer.height,
      aspectRatio: activeLayer.width / activeLayer.height,
    });
  };

  // Dark-on-dark preview warning
  const isDarkGarment =
    selectedColorHex === '#111111' ||
    selectedColorHex === '#0D0D0D' ||
    selectedColorHex === '#1E1E20' ||
    selectedColorHex === '#1A2238';

  return (
    <main
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        flex: 1,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#09090C',
        cursor: currentTool === 'hand' || isPanning ? 'grab' : 'default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Top Floating View Controls */}
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: 'var(--shadow-panel)',
        }}
      >
        {/* Mockup Preview Toggle */}
        <button
          onClick={onToggleMockup}
          className="btn-secondary"
          style={{
            fontSize: '0.78rem',
            padding: '5px 10px',
            background: showMockup ? 'rgba(0, 223, 216, 0.15)' : 'transparent',
            borderColor: showMockup ? 'var(--accent-cyan)' : 'var(--border-subtle)',
            color: showMockup ? 'var(--accent-cyan)' : 'var(--text-secondary)',
          }}
        >
          <Shirt size={14} />
          <span>Garment Mockup {showMockup ? 'ON' : 'OFF'}</span>
        </button>

        <div style={{ height: '16px', width: '1px', background: 'var(--border-subtle)' }} />

        {/* Garment Color Swatches */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Color:</span>
          {garmentColors.map((c) => (
            <button
              key={c.hex}
              onClick={() => onSelectColor(c.hex)}
              title={c.name}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: c.hex,
                border:
                  selectedColorHex === c.hex
                    ? '2px solid var(--accent-cyan)'
                    : '1px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
                transform: selectedColorHex === c.hex ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        <div style={{ height: '16px', width: '1px', background: 'var(--border-subtle)' }} />

        {/* View Specs Display */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: 'var(--text-secondary)',
          }}
        >
          {currentPlacement.printWidthIn}" × {currentPlacement.printHeightIn}" @ {targetDpi} DPI
        </div>
      </div>

      {/* Main Interactive Staging Board */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.05s ease-out',
          position: 'relative',
        }}
      >
        {/* Garment Mockup Silhouette Background (View-Only Layer) */}
        {showMockup && (
          <div
            style={{
              position: 'absolute',
              top: '-120px',
              left: '-140px',
              width: `${canvasWidthPx + 280}px`,
              height: `${canvasHeightPx + 240}px`,
              backgroundColor: selectedColorHex,
              borderRadius: '30px 30px 10px 10px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
              pointerEvents: 'none',
              zIndex: 1,
              transition: 'background-color 0.3s ease',
            }}
          >
            {/* Mockup Collar Cutout */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '180px',
                height: '50px',
                borderBottom: '4px solid rgba(255,255,255,0.06)',
                borderRadius: '0 0 90px 90px',
              }}
            />
            {/* View-Only Badge */}
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '20px',
                fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)',
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.05em',
              }}
            >
              [VIEW-ONLY MOCKUP PREVIEW // EXCLUDED FROM EXPORT]
            </div>
          </div>
        )}

        {/* Printable Area Canvas Container */}
        <div
          className={!showMockup ? 'checkerboard-pattern' : ''}
          style={{
            width: `${canvasWidthPx}px`,
            height: `${canvasHeightPx}px`,
            position: 'relative',
            backgroundColor: showMockup ? 'transparent' : undefined,
            border: '2px solid rgba(0, 223, 216, 0.85)',
            boxShadow: '0 0 25px rgba(0, 223, 216, 0.15)',
            zIndex: 2,
          }}
        >
          {/* Safe Area Guide (0.5 in inside) */}
          <div
            style={{
              position: 'absolute',
              top: `${safeMarginPx}px`,
              left: `${safeMarginPx}px`,
              right: `${safeMarginPx}px`,
              bottom: `${safeMarginPx}px`,
              border: '1px dashed rgba(245, 166, 35, 0.6)',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '-16px',
                left: '4px',
                fontSize: '0.62rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent-amber)',
              }}
            >
              Safe Area Guide ({currentPlacement.safeMarginIn}")
            </span>
          </div>

          {/* Center Crosshair Lines */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: '1px',
              background: 'rgba(255, 255, 255, 0.1)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '50%',
              width: '1px',
              background: 'rgba(255, 255, 255, 0.1)',
              pointerEvents: 'none',
            }}
          />

          {/* Placed Artwork Layer */}
          {activeLayer && activeLayer.visible && (
            <div
              onMouseDown={handleLayerMouseDown}
              style={{
                position: 'absolute',
                left: `${layerScreenX}px`,
                top: `${layerScreenY}px`,
                width: `${layerScreenW}px`,
                height: `${layerScreenH}px`,
                transform: `rotate(${activeLayer.rotation}deg)`,
                opacity: activeLayer.opacity,
                cursor: currentTool === 'select' ? 'move' : 'default',
                outline:
                  currentTool === 'select'
                    ? '1.5px solid var(--accent-cyan)'
                    : 'none',
              }}
            >
              <img
                src={activeLayer.previewUrl}
                alt={activeLayer.name}
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  imageRendering: zoom >= 4 ? 'pixelated' : 'auto',
                }}
              />

              {/* Transform Handles (when in select tool) */}
              {currentTool === 'select' && !activeLayer.locked && (
                <>
                  {/* SE Resize Handle */}
                  <div
                    onMouseDown={(e) => handleResizeStart(e, 'se')}
                    style={{
                      position: 'absolute',
                      right: '-6px',
                      bottom: '-6px',
                      width: '12px',
                      height: '12px',
                      background: 'var(--accent-cyan)',
                      border: '2px solid #08080A',
                      borderRadius: '2px',
                      cursor: 'se-resize',
                    }}
                  />
                  {/* NW Resize Handle */}
                  <div
                    onMouseDown={(e) => handleResizeStart(e, 'nw')}
                    style={{
                      position: 'absolute',
                      left: '-6px',
                      top: '-6px',
                      width: '12px',
                      height: '12px',
                      background: 'var(--accent-cyan)',
                      border: '2px solid #08080A',
                      borderRadius: '2px',
                      cursor: 'nw-resize',
                    }}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dark-on-dark alert when dark artwork is on dark garment */}
      {showMockup && isDarkGarment && activeLayer && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.75rem',
            color: 'var(--accent-amber)',
            border: '1px solid rgba(245, 166, 35, 0.3)',
            zIndex: 30,
          }}
        >
          <AlertCircle size={14} />
          <span>
            Notice: Dark artwork on dark apparel will require white ink underbase on DTF/DTG. Test garment contrast.
          </span>
        </div>
      )}
    </main>
  );
};
