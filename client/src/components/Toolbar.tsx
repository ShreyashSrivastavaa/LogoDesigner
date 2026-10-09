import React from 'react';
import {
  Move,
  Crop,
  Eraser,
  Brush,
  Sparkles,
  Hand,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Maximize2,
  Wand2,
} from 'lucide-react';
import { EditorTool } from '../types';

interface ToolbarProps {
  currentTool: EditorTool;
  onSelectTool: (tool: EditorTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onSelectTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}) => {
  const tools = [
    { id: 'select' as EditorTool, icon: Move, label: 'Select / Transform', shortcut: 'V' },
    { id: 'crop' as EditorTool, icon: Crop, label: 'Crop Artwork', shortcut: 'C' },
    { id: 'erase' as EditorTool, icon: Eraser, label: 'Eraser Brush', shortcut: 'E' },
    { id: 'restore' as EditorTool, icon: Brush, label: 'Restore from Original', shortcut: 'B' },
    { id: 'defringe' as EditorTool, icon: Wand2, label: 'Edge Defringe / Choke', shortcut: 'D' },
    { id: 'hand' as EditorTool, icon: Hand, label: 'Hand / Pan Canvas', shortcut: 'H' },
  ];

  return (
    <aside
      style={{
        width: '54px',
        background: 'var(--bg-studio)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: '6px',
        zIndex: 40,
      }}
    >
      {/* Primary Editing Tools */}
      {tools.map((t) => {
        const Icon = t.icon;
        const isActive = currentTool === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onSelectTool(t.id)}
            title={`${t.label} (${t.shortcut})`}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isActive ? 'rgba(139, 61, 255, 0.1)' : 'transparent',
              color: isActive ? 'var(--color-canva-violet)' : 'var(--color-slate-smoke)',
              border: isActive ? '1px solid rgba(139, 61, 255, 0.35)' : '1px solid transparent',
              boxShadow: isActive ? '0 1px 3px rgba(139, 61, 255, 0.15)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Icon size={18} />
          </button>
        );
      })}

      <div
        style={{
          width: '28px',
          height: '1px',
          background: 'var(--border-subtle)',
          margin: '8px 0',
        }}
      />

      {/* Undo / Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title={canUndo ? "Undo last edit (Ctrl+Z)" : "Undo (Ctrl+Z) - Nothing to undo"}
        aria-label="Undo"
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: canUndo ? '#ffffff' : 'transparent',
          color: canUndo ? 'var(--color-ink-black)' : 'var(--text-muted)',
          border: canUndo ? '1px solid var(--border-strong)' : '1px solid transparent',
          boxShadow: canUndo ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          cursor: canUndo ? 'pointer' : 'not-allowed',
          opacity: canUndo ? 1 : 0.35,
          transition: 'all 0.15s ease',
        }}
      >
        <RotateCcw size={16} />
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        title={canRedo ? "Redo edit (Ctrl+Y)" : "Redo (Ctrl+Y) - Nothing to redo"}
        aria-label="Redo"
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: canRedo ? '#ffffff' : 'transparent',
          color: canRedo ? 'var(--color-ink-black)' : 'var(--text-muted)',
          border: canRedo ? '1px solid var(--border-strong)' : '1px solid transparent',
          boxShadow: canRedo ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          cursor: canRedo ? 'pointer' : 'not-allowed',
          opacity: canRedo ? 1 : 0.35,
          transition: 'all 0.15s ease',
        }}
      >
        <RotateCw size={16} />
      </button>

      <div
        style={{
          width: '28px',
          height: '1px',
          background: 'var(--border-subtle)',
          margin: '8px 0',
        }}
      />

      {/* Zoom controls */}
      <button
        onClick={onZoomIn}
        title="Zoom In (+)"
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          color: 'var(--text-secondary)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <ZoomIn size={16} />
      </button>

      <div
        style={{
          fontSize: '0.62rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          padding: '2px 0',
          textAlign: 'center',
        }}
      >
        {Math.round(zoomPercent)}%
      </div>

      <button
        onClick={onZoomOut}
        title="Zoom Out (-)"
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          color: 'var(--text-secondary)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <ZoomOut size={16} />
      </button>

      <button
        onClick={onResetZoom}
        title="Fit to Screen (0)"
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          color: 'var(--text-secondary)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <Maximize2 size={15} />
      </button>
    </aside>
  );
};
