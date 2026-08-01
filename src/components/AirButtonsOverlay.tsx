import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Undo2, Download, Palette, Sparkles } from 'lucide-react';
import { Point } from '../types';

interface AirButtonsOverlayProps {
  indexTip: Point | null;
  hasHand: boolean;
  onClear: () => void;
  onUndo: () => void;
  onSnapshot: () => void;
  onChangeColor: () => void;
  containerWidth: number;
  containerHeight: number;
}

interface AirButtonDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  colorClass: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

export const AirButtonsOverlay: React.FC<AirButtonsOverlayProps> = ({
  indexTip,
  hasHand,
  onClear,
  onUndo,
  onSnapshot,
  onChangeColor,
  containerWidth,
  containerHeight,
}) => {
  const [hoveredButtonId, setHoveredButtonId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0); // 0 to 1
  const hoverStartTimeRef = useRef<number | null>(null);
  const triggerCooldownRef = useRef<boolean>(false);

  const buttons: AirButtonDef[] = [
    {
      id: 'clear',
      label: 'Air Clear',
      icon: <Trash2 className="w-4 h-4 text-rose-300" />,
      action: onClear,
      colorClass: 'border-rose-400/30 bg-rose-500/20 backdrop-blur-2xl text-rose-200 shadow-xl',
      x: 10,
      y: 12,
    },
    {
      id: 'undo',
      label: 'Air Undo',
      icon: <Undo2 className="w-4 h-4 text-amber-300" />,
      action: onUndo,
      colorClass: 'border-amber-400/30 bg-amber-500/20 backdrop-blur-2xl text-amber-200 shadow-xl',
      x: 30,
      y: 12,
    },
    {
      id: 'color',
      label: 'Air Color',
      icon: <Palette className="w-4 h-4 text-indigo-300" />,
      action: onChangeColor,
      colorClass: 'border-indigo-400/30 bg-indigo-500/20 backdrop-blur-2xl text-indigo-200 shadow-xl',
      x: 70,
      y: 12,
    },
    {
      id: 'snapshot',
      label: 'Air Save',
      icon: <Download className="w-4 h-4 text-emerald-300" />,
      action: onSnapshot,
      colorClass: 'border-emerald-400/30 bg-emerald-500/20 backdrop-blur-2xl text-emerald-200 shadow-xl',
      x: 90,
      y: 12,
    },
  ];

  useEffect(() => {
    if (!hasHand || !indexTip || containerWidth <= 0 || containerHeight <= 0) {
      setHoveredButtonId(null);
      setProgress(0);
      hoverStartTimeRef.current = null;
      return;
    }

    if (triggerCooldownRef.current) return;

    // Check collision between indexTip and air buttons (radius ~45px around button center)
    let foundId: string | null = null;
    let foundBtn: AirButtonDef | null = null;

    for (const btn of buttons) {
      const btnX = (btn.x / 100) * containerWidth;
      const btnY = (btn.y / 100) * containerHeight;
      const dx = indexTip.x - btnX;
      const dy = indexTip.y - btnY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 45) {
        foundId = btn.id;
        foundBtn = btn;
        break;
      }
    }

    if (foundId && foundBtn) {
      if (hoveredButtonId !== foundId) {
        setHoveredButtonId(foundId);
        hoverStartTimeRef.current = Date.now();
        setProgress(0);
      } else if (hoverStartTimeRef.current) {
        const elapsed = Date.now() - hoverStartTimeRef.current;
        const hoverDurationNeeded = 800; // 0.8 seconds hover trigger
        const p = Math.min(1, elapsed / hoverDurationNeeded);
        setProgress(p);

        if (p >= 1) {
          // Trigger Air Action!
          foundBtn.action();
          triggerCooldownRef.current = true;
          setHoveredButtonId(null);
          setProgress(0);
          hoverStartTimeRef.current = null;

          setTimeout(() => {
            triggerCooldownRef.current = false;
          }, 1200);
        }
      }
    } else {
      setHoveredButtonId(null);
      setProgress(0);
      hoverStartTimeRef.current = null;
    }
  }, [indexTip, hasHand, containerWidth, containerHeight, hoveredButtonId]);

  if (containerWidth <= 0 || containerHeight <= 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {buttons.map((btn) => {
        const isHovered = hoveredButtonId === btn.id;
        const btnX = (btn.x / 100) * containerWidth;
        const btnY = (btn.y / 100) * containerHeight;

        return (
          <button
            key={btn.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              btn.action();
            }}
            className={`pointer-events-auto cursor-pointer absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 px-3.5 py-2 rounded-2xl border transition-all duration-200 ${
              btn.colorClass
            } ${isHovered ? 'scale-110 shadow-2xl shadow-indigo-500/30 ring-2 ring-indigo-400' : 'opacity-90 hover:scale-105 hover:opacity-100'}`}
            style={{ left: `${btnX}px`, top: `${btnY}px` }}
          >
            {btn.icon}
            <span className="text-xs font-semibold tracking-wide whitespace-nowrap">{btn.label}</span>

            {/* Hover Timer Progress Ring */}
            {isHovered && (
              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div
                  className="h-full bg-indigo-400/30 transition-all ease-linear"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
