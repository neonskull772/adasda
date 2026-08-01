import React from 'react';
import { X, Hand, Sparkles, CheckCircle2 } from 'lucide-react';
import { GestureType } from '../types';

interface GestureGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGesture: GestureType;
  pinchDistance: number;
}

export const GestureGuideModal: React.FC<GestureGuideModalProps> = ({
  isOpen,
  onClose,
  activeGesture,
  pinchDistance,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-fade-in">
      <div className="backdrop-blur-2xl bg-slate-950/80 border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto no-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <Hand className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">How to Paint in the Air</h2>
            <p className="text-xs text-white/50">Master hand gestures to draw smoothly</p>
          </div>
        </div>

        {/* Live Gesture Tester */}
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-xs text-white/60">
            <span className="font-semibold text-white/80">Live Gesture Detection:</span>
            <span className="font-mono text-indigo-300">Pinch Gap: {(pinchDistance * 100).toFixed(1)}</span>
          </div>
          <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-300" />
              <span className="text-sm font-bold text-white capitalize">{activeGesture || 'No Hand Detected'}</span>
            </div>
            {activeGesture === 'pinch' && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-400/30">
                Penciling Active
              </span>
            )}
          </div>
        </div>

        {/* Gesture Cards */}
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3.5 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-2xl p-2 bg-white/10 rounded-xl border border-white/10">🤏</div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Pinch Thumb + Index <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">Draw</span>
              </h3>
              <p className="text-xs text-white/70 mt-0.5">
                Pinch your index finger and thumb tip together to press pen down. Separate them to lift the pen and hover.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-2xl p-2 bg-white/10 rounded-xl border border-white/10">☝️</div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Index Finger Extended <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">Aim / Point</span>
              </h3>
              <p className="text-xs text-white/70 mt-0.5">
                Your index finger tip controls the cursor position in real-time. Smooth tracking keeps lines crisp.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-2xl p-2 bg-white/10 rounded-xl border border-white/10">✊👐</div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Fist Grip & Dual-Hand Rotation <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">Grab & Rotate</span>
              </h3>
              <p className="text-xs text-white/70 mt-0.5">
                Make a fist ✊ near any stroke to grab it and all connected intersecting strokes. Move hand to drag! Bring in your second hand ✋ and move around the fist to rotate the strokes in 360° real-time!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-2xl p-2 bg-white/10 rounded-xl border border-white/10">✌️</div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Peace Sign (2 Fingers) <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">Hover / Select</span>
              </h3>
              <p className="text-xs text-white/70 mt-0.5">
                Extend index and middle finger to freely inspect or aim without painting any strokes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-2xl p-2 bg-white/10 rounded-xl border border-white/10">🖐️</div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Air Touch Hotspots <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">Hands-Free</span>
              </h3>
              <p className="text-xs text-white/70 mt-0.5">
                Hover finger over on-screen air buttons (Clear, Undo, Color, Save) for 1 second to trigger actions without touching a mouse!
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-white text-black font-bold rounded-2xl text-sm transition shadow-xl shadow-white/10 hover:bg-white/90 flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Got it, Start Painting!
        </button>
      </div>
    </div>
  );
};
