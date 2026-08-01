import React, { useState } from 'react';
import { BrushType, CanvasBackground, GestureMode } from '../types';
import {
  Paintbrush,
  Sparkles,
  Zap,
  Palette,
  Sliders,
  Maximize2,
  Minimize2,
  Eraser,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Grid,
  Circle,
  FlipHorizontal,
  Hand,
  Crosshair,
  Feather,
  Highlighter,
  Shapes,
  Flame,
} from 'lucide-react';

interface ControlPanelProps {
  brushType: BrushType;
  setBrushType: (brush: BrushType) => void;
  color: string;
  setColor: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  opacity: number;
  setOpacity: (opacity: number) => void;
  gestureMode: GestureMode;
  setGestureMode: (mode: GestureMode) => void;
  pinchThreshold: number;
  setPinchThreshold: (val: number) => void;
  smoothingFactor: number;
  setSmoothingFactor: (val: number) => void;
  background: CanvasBackground;
  setBackground: (bg: CanvasBackground) => void;
  isMirrored: boolean;
  setIsMirrored: (mirrored: boolean) => void;
  showSkeleton: boolean;
  setShowSkeleton: (show: boolean) => void;
  showAirButtons: boolean;
  setShowAirButtons: (show: boolean) => void;
  enableMagicShapes?: boolean;
  setEnableMagicShapes?: (val: boolean) => void;
}

const PRESET_COLORS = [
  { name: 'Neon Cyan', value: '#06b6d4' },
  { name: 'Electric Purple', value: '#a855f7' },
  { name: 'Hot Pink', value: '#ec4899' },
  { name: 'Sunburst Yellow', value: '#eab308' },
  { name: 'Emerald Green', value: '#10b981' },
  { name: 'Pure White', value: '#ffffff' },
  { name: 'Flame Orange', value: '#f97316' },
  { name: 'Deep Blue', value: '#3b82f6' },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  brushType,
  setBrushType,
  color,
  setColor,
  brushSize,
  setBrushSize,
  opacity,
  setOpacity,
  gestureMode,
  setGestureMode,
  pinchThreshold,
  setPinchThreshold,
  smoothingFactor,
  setSmoothingFactor,
  background,
  setBackground,
  isMirrored,
  setIsMirrored,
  showSkeleton,
  setShowSkeleton,
  showAirButtons,
  setShowAirButtons,
  enableMagicShapes = false,
  setEnableMagicShapes,
}) => {
  const [activeTab, setActiveTab] = useState<'brushes' | 'colors' | 'gestures' | 'canvas'>('brushes');
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[95%] max-w-2xl backdrop-blur-2xl bg-slate-950/70 rounded-[28px] border border-white/10 shadow-2xl transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4'}`}>
      {/* Header bar with Tab controls & collapse button */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => { setActiveTab('brushes'); setIsCollapsed(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              activeTab === 'brushes' && !isCollapsed
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>Brushes</span>
          </button>

          <button
            onClick={() => { setActiveTab('colors'); setIsCollapsed(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              activeTab === 'colors' && !isCollapsed
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="w-3 h-3 rounded-full border border-white/40" style={{ backgroundColor: color }} />
            <span>Color & Size</span>
          </button>

          <button
            onClick={() => { setActiveTab('gestures'); setIsCollapsed(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              activeTab === 'gestures' && !isCollapsed
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Gestures</span>
          </button>

          <button
            onClick={() => { setActiveTab('canvas'); setIsCollapsed(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              activeTab === 'canvas' && !isCollapsed
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Canvas View</span>
          </button>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"
          title={isCollapsed ? "Expand Tools" : "Collapse Tools"}
        >
          {isCollapsed ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="space-y-4">
          {/* TAB 1: BRUSHES */}
          {activeTab === 'brushes' && (
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
              <button
                onClick={() => setBrushType('solid')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] gap-1 transition border ${
                  brushType === 'solid'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40 shadow-lg shadow-indigo-500/10'
                    : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                }`}
              >
                <Paintbrush className="w-3.5 h-3.5" />
                <span>Solid</span>
              </button>

              <button
                onClick={() => setBrushType('neon')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] gap-1 transition border ${
                  brushType === 'neon'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-400/40 shadow-lg shadow-purple-500/10'
                    : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-purple-300" />
                <span>Neon</span>
              </button>

              <button
                onClick={() => setBrushType('laser')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] gap-1 transition border ${
                  brushType === 'laser'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-lg shadow-cyan-500/10'
                    : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-cyan-300" />
                <span>Laser</span>
              </button>

              <button
                onClick={() => setBrushType('rainbow')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] gap-1 transition border ${
                  brushType === 'rainbow'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-lg shadow-amber-500/10'
                    : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-amber-300" />
                <span>Rainbow</span>
              </button>

              <button
                onClick={() => setBrushType('sparkles')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] gap-1 transition border ${
                  brushType === 'sparkles'
                    ? 'bg-pink-500/20 text-pink-300 border-pink-400/40 shadow-lg shadow-pink-500/10'
                    : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-pink-300" />
                <span>Sparkle</span>
              </button>

              <button
                onClick={() => setBrushType('particles')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] gap-1 transition border ${
                  brushType === 'particles'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-lg shadow-emerald-500/10'
                    : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span>Dust FX</span>
              </button>

              <button
                onClick={() => setBrushType('calligraphy')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] gap-1 transition border ${
                  brushType === 'calligraphy'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40 shadow-lg shadow-indigo-500/10'
                    : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                }`}
              >
                <Feather className="w-3.5 h-3.5 text-indigo-300" />
                <span>Ribbon</span>
              </button>

              <button
                onClick={() => setBrushType('highlighter')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] gap-1 transition border ${
                  brushType === 'highlighter'
                    ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40 shadow-lg shadow-yellow-500/10'
                    : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                }`}
              >
                <Highlighter className="w-3.5 h-3.5 text-yellow-300" />
                <span>Marker</span>
              </button>

              <button
                onClick={() => setBrushType('eraser')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] gap-1 transition border ${
                  brushType === 'eraser'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-400/40 shadow-lg shadow-rose-500/10'
                    : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                }`}
              >
                <Eraser className="w-3.5 h-3.5 text-rose-300" />
                <span>Eraser</span>
              </button>
            </div>
          )}

          {/* TAB 2: COLORS & SLIDERS */}
          {activeTab === 'colors' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={`w-8 h-8 rounded-full flex-shrink-0 transition transform hover:scale-110 flex items-center justify-center border-2 ${
                      color === c.value ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full border border-white/20 bg-white/10 flex-shrink-0 overflow-hidden">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="absolute -inset-2 w-12 h-12 cursor-pointer opacity-0"
                  />
                  <Palette className="w-4 h-4 text-white/80" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 p-3 rounded-2xl border border-white/10">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-white/70 font-medium">
                    <span>Brush Size</span>
                    <span>{brushSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="40"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full accent-indigo-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-white/70 font-medium">
                    <span>Opacity</span>
                    <span>{Math.round(opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-full accent-indigo-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GESTURE CONFIGURATION */}
          {activeTab === 'gestures' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => setGestureMode('pinch')}
                  className={`p-2.5 rounded-xl text-xs font-medium text-center border transition ${
                    gestureMode === 'pinch'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
                      : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="font-semibold text-sm mb-0.5">🤏 Pinch</div>
                  <div className="text-[10px] text-white/50">Thumb + Index</div>
                </button>

                <button
                  onClick={() => setGestureMode('pointing')}
                  className={`p-2.5 rounded-xl text-xs font-medium text-center border transition ${
                    gestureMode === 'pointing'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
                      : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="font-semibold text-sm mb-0.5">☝️ Point</div>
                  <div className="text-[10px] text-white/50">Extended Finger</div>
                </button>

                <button
                  onClick={() => setGestureMode('peace_hover')}
                  className={`p-2.5 rounded-xl text-xs font-medium text-center border transition ${
                    gestureMode === 'peace_hover'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
                      : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="font-semibold text-sm mb-0.5">✌️ Peace Hover</div>
                  <div className="text-[10px] text-white/50">2 Fingers Hover</div>
                </button>

                <button
                  onClick={() => setGestureMode('fist_grip')}
                  className={`p-2.5 rounded-xl text-xs font-medium text-center border transition ${
                    gestureMode === 'fist_grip'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-400/40 shadow-lg shadow-purple-500/10'
                      : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="font-semibold text-sm mb-0.5">✊ Fist Grip</div>
                  <div className="text-[10px] text-white/50">Grip & Move</div>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 p-3 rounded-2xl border border-white/10">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-white/70 font-medium">
                    <span>Pinch Sensitivity</span>
                    <span>{Math.round(pinchThreshold * 100)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.04"
                    max="0.20"
                    step="0.01"
                    value={pinchThreshold}
                    onChange={(e) => setPinchThreshold(Number(e.target.value))}
                    className="w-full accent-indigo-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                  />
                  <p className="text-[10px] text-white/40">Lower = Requires tighter pinch</p>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-white/70 font-medium">
                    <span>Line Smoothing</span>
                    <span>{Math.round((1 - smoothingFactor) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.05"
                    value={smoothingFactor}
                    onChange={(e) => setSmoothingFactor(Number(e.target.value))}
                    className="w-full accent-indigo-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                  />
                  <p className="text-[10px] text-white/40">Smooths out hand tremor jitter</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CANVAS VIEW & TOGGLES */}
          {activeTab === 'canvas' && (
            <div className="space-y-3">
              <div className="text-xs font-medium text-white/70">Canvas Surface Style</div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <button
                  onClick={() => setBackground('transparent')}
                  className={`p-2 rounded-xl text-xs font-medium flex flex-col items-center gap-1 border transition ${
                    background === 'transparent'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
                      : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Webcam</span>
                </button>

                <button
                  onClick={() => setBackground('dark')}
                  className={`p-2 rounded-xl text-xs font-medium flex flex-col items-center gap-1 border transition ${
                    background === 'dark'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
                      : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark Slate</span>
                </button>

                <button
                  onClick={() => setBackground('light')}
                  className={`p-2 rounded-xl text-xs font-medium flex flex-col items-center gap-1 border transition ${
                    background === 'light'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
                      : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light Paper</span>
                </button>

                <button
                  onClick={() => setBackground('grid')}
                  className={`p-2 rounded-xl text-xs font-medium flex flex-col items-center gap-1 border transition ${
                    background === 'grid'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
                      : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Grid</span>
                </button>

                <button
                  onClick={() => setBackground('dots')}
                  className={`p-2 rounded-xl text-xs font-medium flex flex-col items-center gap-1 border transition ${
                    background === 'dots'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
                      : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Circle className="w-3.5 h-3.5" />
                  <span>Dots</span>
                </button>

                <button
                  onClick={() => setBackground('neon_grid')}
                  className={`p-2 rounded-xl text-xs font-medium flex flex-col items-center gap-1 border transition ${
                    background === 'neon_grid'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
                      : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Cyber Grid</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                <button
                  onClick={() => setIsMirrored(!isMirrored)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                    isMirrored
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
                      : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>Mirror Feed</span>
                </button>

                <button
                  onClick={() => setShowSkeleton(!showSkeleton)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                    showSkeleton
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
                      : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {showSkeleton ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>Hand Skeleton</span>
                </button>

                <button
                  onClick={() => setShowAirButtons(!showAirButtons)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                    showAirButtons
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
                      : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Air Buttons</span>
                </button>

                {setEnableMagicShapes && (
                  <button
                    onClick={() => setEnableMagicShapes(!enableMagicShapes)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                      enableMagicShapes
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                        : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Shapes className="w-3.5 h-3.5 text-amber-300" />
                    <span>Magic Shapes</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
