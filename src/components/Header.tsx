import React from 'react';
import { Camera, Sparkles, Trash2, Undo2, Redo2, Download, Image as ImageIcon, HelpCircle, Hand, Bot, Film } from 'lucide-react';
import { GestureType } from '../types';

interface HeaderProps {
  isWebcamActive: boolean;
  hasHand: boolean;
  activeGesture: GestureType;
  isDrawing: boolean;
  fps: number;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSnapshot: () => void;
  onOpenGallery: () => void;
  onOpenGuide: () => void;
  onOpenAiModal: () => void;
  onOpenReplay?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isWebcamActive,
  hasHand,
  activeGesture,
  isDrawing,
  fps,
  onClear,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSnapshot,
  onOpenGallery,
  onOpenGuide,
  onOpenAiModal,
  onOpenReplay,
}) => {
  const getGestureBadge = () => {
    if (!isWebcamActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-xl bg-white/5 text-white/50 border border-white/10">
          <Camera className="w-3.5 h-3.5" /> Camera Off
        </span>
      );
    }

    if (!hasHand) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse">
          <Hand className="w-3.5 h-3.5" /> Show Hand
        </span>
      );
    }

    if (activeGesture === 'fist') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-xl bg-purple-500/20 text-purple-300 border border-purple-400/30">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
          ✊ Fist Grip (Moving)
        </span>
      );
    }

    if (isDrawing) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          Drawing Air Stroke
        </span>
      );
    }

    if (activeGesture === 'pinch') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
          🤏 Pinched
        </span>
      );
    }

    if (activeGesture === 'peace') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-xl bg-purple-500/20 text-purple-300 border border-purple-400/30">
          ✌️ Hover / Select
        </span>
      );
    }

    if (activeGesture === 'open_palm') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-xl bg-rose-500/20 text-rose-300 border border-rose-400/30">
          🖐️ Open Palm
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-xl bg-white/10 text-white/90 border border-white/20">
        <Hand className="w-3.5 h-3.5 text-indigo-400" /> Hand Detected
      </span>
    );
  };

  return (
    <header className="h-16 backdrop-blur-2xl bg-white/5 border-b border-white/10 px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 relative">
      {/* Brand Title */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            AirDraw <span className="text-indigo-400 font-mono text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30">PRO 2.4</span>
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-white/40 hidden sm:block">Spatial Interaction Active</p>
        </div>
      </div>

      {/* Center Status Indicators */}
      <div className="hidden md:flex items-center gap-3">
        {getGestureBadge()}
        {isWebcamActive && (
          <span className="text-xs font-mono font-medium text-white/80 backdrop-blur-xl bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
            FPS: {fps}
          </span>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center backdrop-blur-xl bg-white/5 rounded-xl p-1 border border-white/10">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 text-white/80 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 rounded-lg transition"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 text-white/80 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 rounded-lg transition"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button
            onClick={onClear}
            title="Clear Canvas"
            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={onSnapshot}
          title="Download Snapshot"
          className="flex items-center gap-1.5 px-4 py-2 bg-white text-black font-bold rounded-xl text-xs shadow-xl shadow-white/10 hover:bg-white/90 transition active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">EXPORT</span>
        </button>

        {onOpenReplay && (
          <button
            onClick={onOpenReplay}
            title="Replay Drawing Animation"
            className="p-2.5 text-amber-300 hover:text-amber-200 backdrop-blur-xl bg-amber-500/20 hover:bg-amber-500/30 rounded-xl border border-amber-400/30 transition"
          >
            <Film className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onOpenGallery}
          title="Saved Artwork Gallery"
          className="p-2.5 text-white/80 hover:text-white backdrop-blur-xl bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenAiModal}
          title="AI Interpretation"
          className="p-2.5 text-indigo-300 hover:text-indigo-200 backdrop-blur-xl bg-indigo-500/20 hover:bg-indigo-500/30 rounded-xl border border-indigo-400/30 transition"
        >
          <Bot className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenGuide}
          title="Gesture Guide & Instructions"
          className="p-2.5 text-white/80 hover:text-white backdrop-blur-xl bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
