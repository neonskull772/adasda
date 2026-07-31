import React from 'react';
import { X, Trash2, Download, Image as ImageIcon, Calendar } from 'lucide-react';
import { Artwork } from '../types';

interface ArtworkGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  artworks: Artwork[];
  onDeleteArtwork: (id: string) => void;
  onDownloadArtwork: (artwork: Artwork) => void;
}

export const ArtworkGalleryModal: React.FC<ArtworkGalleryModalProps> = ({
  isOpen,
  onClose,
  artworks,
  onDeleteArtwork,
  onDownloadArtwork,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-fade-in">
      <div className="backdrop-blur-2xl bg-slate-950/80 border border-white/10 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 relative max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Air Artwork Gallery</h2>
              <p className="text-xs text-white/50">Your saved hand-drawn air creations ({artworks.length})</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {artworks.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-white/40 space-y-3">
            <ImageIcon className="w-12 h-12 stroke-[1.5] text-white/20" />
            <div>
              <p className="text-sm font-semibold text-white/70">No saved air drawings yet</p>
              <p className="text-xs text-white/40 mt-1">Pinch in the air to draw, then click "EXPORT" or use Air Save!</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto no-scrollbar p-1">
            {artworks.map((art) => (
              <div
                key={art.id}
                className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden group hover:border-indigo-400/50 transition duration-300 space-y-2 p-3"
              >
                <div className="aspect-video w-full bg-black/40 rounded-xl overflow-hidden relative border border-white/10">
                  <img
                    src={art.thumbnailUrl || art.dataUrl}
                    alt={art.title}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <h3 className="text-sm font-semibold text-white truncate max-w-[150px]">{art.title}</h3>
                    <div className="flex items-center gap-1 text-[11px] text-white/40">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(art.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onDownloadArtwork(art)}
                      title="Download PNG"
                      className="p-2 text-indigo-300 hover:bg-white/10 rounded-xl transition"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteArtwork(art.id)}
                      title="Delete"
                      className="p-2 text-rose-300 hover:bg-rose-500/20 rounded-xl transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
