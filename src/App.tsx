import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Artwork,
  BrushType,
  CanvasBackground,
  GestureMode,
  HandDetectionResult,
  Stroke,
} from './types';
import { Header } from './components/Header';
import { ControlPanel } from './components/ControlPanel';
import { WebcamCanvasOverlay } from './components/WebcamCanvasOverlay';
import { GestureGuideModal } from './components/GestureGuideModal';
import { ArtworkGalleryModal } from './components/ArtworkGalleryModal';
import { AiArtworkEnhancerModal } from './components/AiArtworkEnhancerModal';

const PRESET_COLORS_LIST = ['#06b6d4', '#a855f7', '#ec4899', '#eab308', '#10b981', '#ffffff', '#f97316', '#3b82f6'];

export default function App() {
  const [brushType, setBrushType] = useState<BrushType>('solid');
  const [color, setColor] = useState<string>('#06b6d4');
  const [brushSize, setBrushSize] = useState<number>(12);
  const [opacity, setOpacity] = useState<number>(1);
  const [gestureMode, setGestureMode] = useState<GestureMode>('pinch');
  const [pinchThreshold, setPinchThreshold] = useState<number>(0.08);
  const [smoothingFactor, setSmoothingFactor] = useState<number>(0.35);
  const [background, setBackground] = useState<CanvasBackground>('transparent');
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);
  const [showAirButtons, setShowAirButtons] = useState<boolean>(true);

  // Hand tracking live telemetry
  const [handDetection, setHandDetection] = useState<HandDetectionResult>({
    landmarks: [],
    gesture: 'none',
    pinchDistance: 1,
    indexTip: { x: 0, y: 0 },
    thumbTip: { x: 0, y: 0 },
    wrist: { x: 0, y: 0 },
    isDrawing: false,
    handSide: 'Unknown',
  });
  const [fps, setFps] = useState<number>(0);

  // Drawing Canvas & Strokes State
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);

  // Artwork Gallery Storage
  const [artworks, setArtworks] = useState<Artwork[]>(() => {
    try {
      const saved = localStorage.getItem('airdraw_artworks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal Views
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  // Save Artworks to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('airdraw_artworks', JSON.stringify(artworks));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [artworks]);

  const handleHandUpdate = useCallback((detection: HandDetectionResult, liveFps: number) => {
    setHandDetection(detection);
    setFps(liveFps);
  }, []);

  const handleSaveStrokeToHistory = useCallback((stroke: Stroke) => {
    if (stroke.points.length > 0) {
      setStrokes((prev) => [...prev, stroke]);
      setRedoStack([]);
    }
  }, []);

  const handleUndo = useCallback(() => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, last]);
      return prev.slice(0, prev.length - 1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const next = prev[prev.length - 1];
      setStrokes((s) => [...s, next]);
      return prev.slice(0, prev.length - 1);
    });
  }, []);

  const handleClearCanvas = useCallback(() => {
    setStrokes([]);
    setRedoStack([]);
    setCurrentStroke(null);
  }, []);

  const handleChangeColor = useCallback(() => {
    setColor((prev) => {
      const idx = PRESET_COLORS_LIST.indexOf(prev);
      const nextIdx = (idx + 1) % PRESET_COLORS_LIST.length;
      return PRESET_COLORS_LIST[nextIdx];
    });
  }, []);

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Export & Download Artwork
  const handleSnapshot = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const newArt: Artwork = {
        id: 'art_' + Date.now(),
        title: `Air Creation #${artworks.length + 1}`,
        createdAt: Date.now(),
        dataUrl,
        strokesCount: strokes.length,
        thumbnailUrl: dataUrl,
      };

      setArtworks((prev) => [newArt, ...prev]);

      // Trigger Browser Download
      const link = document.createElement('a');
      link.download = `AirDraw_Artwork_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Snapshot failed:', e);
    }
  }, [drawingCanvasRef, artworks.length, strokes.length]);

  const handleDeleteArtwork = useCallback((id: string) => {
    setArtworks((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleDownloadArtwork = useCallback((art: Artwork) => {
    const link = document.createElement('a');
    link.download = `${art.title.replace(/\s+/g, '_')}.png`;
    link.href = art.dataUrl;
    link.click();
  }, []);

  const getCanvasImageDataUrl = useCallback(() => {
    if (!drawingCanvasRef.current) return null;
    return drawingCanvasRef.current.toDataURL('image/png');
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-white font-sans overflow-hidden select-none">
      {/* Header Bar */}
      <Header
        isWebcamActive={true}
        hasHand={handDetection.landmarks.length > 0}
        activeGesture={handDetection.gesture}
        isDrawing={handDetection.isDrawing}
        fps={fps}
        onClear={handleClearCanvas}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={strokes.length > 0}
        canRedo={redoStack.length > 0}
        onSnapshot={handleSnapshot}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenAiModal={() => setIsAiModalOpen(true)}
      />

      {/* Primary Air Canvas View */}
      <main className="relative flex-1 w-full h-full">
        <WebcamCanvasOverlay
          brushType={brushType}
          color={color}
          brushSize={brushSize}
          opacity={opacity}
          gestureMode={gestureMode}
          pinchThreshold={pinchThreshold}
          smoothingFactor={smoothingFactor}
          background={background}
          isMirrored={isMirrored}
          showSkeleton={showSkeleton}
          showAirButtons={showAirButtons}
          onHandUpdate={handleHandUpdate}
          strokes={strokes}
          setStrokes={setStrokes}
          currentStroke={currentStroke}
          setCurrentStroke={setCurrentStroke}
          onSaveStrokeToHistory={handleSaveStrokeToHistory}
          onClearCanvas={handleClearCanvas}
          onUndo={handleUndo}
          onSnapshot={handleSnapshot}
          onChangeColor={handleChangeColor}
          drawingCanvasRef={drawingCanvasRef}
        />

        {/* Floating Controls Bar */}
        <ControlPanel
          brushType={brushType}
          setBrushType={setBrushType}
          color={color}
          setColor={setColor}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          opacity={opacity}
          setOpacity={setOpacity}
          gestureMode={gestureMode}
          setGestureMode={setGestureMode}
          pinchThreshold={pinchThreshold}
          setPinchThreshold={setPinchThreshold}
          smoothingFactor={smoothingFactor}
          setSmoothingFactor={setSmoothingFactor}
          background={background}
          setBackground={setBackground}
          isMirrored={isMirrored}
          setIsMirrored={setIsMirrored}
          showSkeleton={showSkeleton}
          setShowSkeleton={setShowSkeleton}
          showAirButtons={showAirButtons}
          setShowAirButtons={setShowAirButtons}
        />
      </main>

      {/* Gesture Guide Modal */}
      <GestureGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        activeGesture={handDetection.gesture}
        pinchDistance={handDetection.pinchDistance}
      />

      {/* Gallery Modal */}
      <ArtworkGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        artworks={artworks}
        onDeleteArtwork={handleDeleteArtwork}
        onDownloadArtwork={handleDownloadArtwork}
      />

      {/* AI Interpretation Modal */}
      <AiArtworkEnhancerModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        getCanvasImageDataUrl={getCanvasImageDataUrl}
      />
    </div>
  );
}
