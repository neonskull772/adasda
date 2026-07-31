import React, { useState } from 'react';
import { X, Bot, Sparkles, RefreshCw, Wand2, Lightbulb } from 'lucide-react';

interface AiArtworkEnhancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  getCanvasImageDataUrl: () => string | null;
}

export const AiArtworkEnhancerModal: React.FC<AiArtworkEnhancerModalProps> = ({
  isOpen,
  onClose,
  getCanvasImageDataUrl,
}) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    const dataUrl = getCanvasImageDataUrl();
    if (!dataUrl) {
      setError('Please draw something on the canvas first!');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch('/api/interpret-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to interpret artwork');
      }

      const result = await response.json();
      setAnalysis(result.analysis);
    } catch (err: any) {
      console.error('AI Interpretation error:', err);
      setError(err.message || 'Error connecting to Gemini AI');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-fade-in">
      <div className="backdrop-blur-2xl bg-slate-950/80 border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative max-h-[85vh] overflow-y-auto no-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Gemini AI Art Critic</h2>
            <p className="text-xs text-white/50">Get instant AI feedback & creative ideas on your air drawing</p>
          </div>
        </div>

        {!analysis && !isLoading && (
          <div className="text-center py-6 space-y-4 bg-white/5 p-6 rounded-2xl border border-white/10">
            <Wand2 className="w-10 h-10 text-indigo-300 mx-auto animate-bounce" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Analyze Your Air Sketch</h3>
              <p className="text-xs text-white/60 max-w-xs mx-auto">
                Gemini AI will inspect your air stroke geometry, recognize objects/patterns, and suggest creative additions!
              </p>
            </div>
            <button
              onClick={handleAnalyze}
              className="px-5 py-2.5 bg-white text-black font-bold rounded-xl text-xs transition shadow-xl shadow-white/10 hover:bg-white/90 inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" /> Interpret Air Drawing
            </button>
          </div>
        )}

        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-300 animate-spin" />
            <p className="text-sm font-semibold text-white/80">Gemini AI is analyzing your air strokes...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-500/20 border border-rose-400/30 text-rose-200 rounded-xl text-xs backdrop-blur-xl">
            {error}
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold">
                <Lightbulb className="w-4 h-4" /> AI Artistic Feedback
              </div>
              <div className="text-xs text-white/80 leading-relaxed whitespace-pre-line font-mono">
                {analysis}
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 border border-white/10"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-analyze Drawing
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
