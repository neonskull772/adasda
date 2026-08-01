import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, X, FastForward, Film, Download } from 'lucide-react';
import { CanvasBackground, Stroke } from '../types';
import { renderBackground, renderStroke } from '../utils/canvasRenderer';

interface ReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  strokes: Stroke[];
  background: CanvasBackground;
}

export const ReplayModal: React.FC<ReplayModalProps> = ({
  isOpen,
  onClose,
  strokes,
  background,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [progress, setProgress] = useState<number>(0); // 0 to 1
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Flatten all stroke points into a timeline sequence
  const strokePointsRef = useRef<{ strokeIndex: number; pointIndex: number }[]>([]);

  useEffect(() => {
    const list: { strokeIndex: number; pointIndex: number }[] = [];
    strokes.forEach((s, sIdx) => {
      s.points.forEach((_, pIdx) => {
        list.push({ strokeIndex: sIdx, pointIndex: pIdx });
      });
    });
    strokePointsRef.current = list;
    setProgress(0);
    setIsPlaying(false);
  }, [strokes]);

  const drawReplayState = useCallback((currentProgress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderBackground(ctx, canvas.width, canvas.height, background);

    const totalPts = strokePointsRef.current.length;
    if (totalPts === 0) return;

    const visibleCount = Math.floor(currentProgress * totalPts);
    const activePointInfo = strokePointsRef.current[visibleCount - 1] || strokePointsRef.current[0];

    for (let sIdx = 0; sIdx <= activePointInfo.strokeIndex; sIdx++) {
      const origStroke = strokes[sIdx];
      if (!origStroke) continue;

      if (sIdx < activePointInfo.strokeIndex) {
        renderStroke(ctx, origStroke);
      } else {
        const subPoints = origStroke.points.slice(0, activePointInfo.pointIndex + 1);
        if (subPoints.length > 0) {
          renderStroke(ctx, { ...origStroke, points: subPoints });
        }
      }
    }
  }, [background, strokes]);

  useEffect(() => {
    drawReplayState(progress);
  }, [progress, drawReplayState]);

  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    let lastTime = performance.now();
    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const totalPts = strokePointsRef.current.length;
      if (totalPts === 0) {
        setIsPlaying(false);
        return;
      }

      // Base playback speed: complete drawing in ~4 seconds at 1x
      const rate = (0.25 * speed) / Math.max(1, strokes.length * 0.5);

      setProgress((prev) => {
        const next = prev + delta * rate;
        if (next >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return next;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, speed, strokes.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-3xl w-full shadow-2xl flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Air Drawing Replay</h2>
              <p className="text-xs text-slate-400">Watch your creation come to life stroke-by-stroke</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Display */}
        <div className="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800/80 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={800}
            height={450}
            className="w-full h-full object-contain"
          />
          {strokes.length === 0 && (
            <p className="absolute text-xs text-slate-500">No artwork strokes to replay yet.</p>
          )}
        </div>

        {/* Timeline Slider & Controls */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono w-10">
              {Math.round(progress * 100)}%
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={progress}
              onChange={(e) => {
                setIsPlaying(false);
                setProgress(parseFloat(e.target.value));
              }}
              className="flex-1 accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={strokes.length === 0}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pause' : 'Play Replay'}
              </button>

              <button
                onClick={() => {
                  setProgress(0);
                  setIsPlaying(true);
                }}
                disabled={strokes.length === 0}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                    speed === s
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
