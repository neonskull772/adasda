import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  BrushType,
  CanvasBackground,
  GestureMode,
  GestureType,
  HandDetectionResult,
  Point,
  Stroke,
} from '../types';
import { analyzeHandLandmarks, PointSmoother } from '../utils/handGesture';
import { drawMultiHandOverlay, renderBackground, renderStroke } from '../utils/canvasRenderer';
import { getHandLandmarker } from '../utils/mediaPipeService';
import { AirButtonsOverlay } from './AirButtonsOverlay';
import { Camera, CameraOff, RefreshCw, AlertTriangle, Fullscreen } from 'lucide-react';

interface WebcamCanvasOverlayProps {
  brushType: BrushType;
  color: string;
  brushSize: number;
  opacity: number;
  gestureMode: GestureMode;
  pinchThreshold: number;
  smoothingFactor: number;
  background: CanvasBackground;
  isMirrored: boolean;
  showSkeleton: boolean;
  showAirButtons: boolean;
  onHandUpdate: (detection: HandDetectionResult, fps: number) => void;
  strokes: Stroke[];
  setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
  currentStroke: Stroke | null;
  setCurrentStroke: React.Dispatch<React.SetStateAction<Stroke | null>>;
  onSaveStrokeToHistory: (stroke: Stroke) => void;
  onClearCanvas: () => void;
  onUndo: () => void;
  onSnapshot: () => void;
  onChangeColor: () => void;
  drawingCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const WebcamCanvasOverlay: React.FC<WebcamCanvasOverlayProps> = ({
  brushType,
  color,
  brushSize,
  opacity,
  gestureMode,
  pinchThreshold,
  smoothingFactor,
  background,
  isMirrored,
  showSkeleton,
  showAirButtons,
  onHandUpdate,
  strokes,
  setStrokes,
  currentStroke,
  setCurrentStroke,
  onSaveStrokeToHistory,
  onClearCanvas,
  onUndo,
  onSnapshot,
  onChangeColor,
  drawingCanvasRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(true);
  const [modelStatusText, setModelStatusText] = useState<string>('Initializing AI engine...');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isWebcamStarted, setIsWebcamStarted] = useState<boolean>(false);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 1280, height: 720 });

  // Internal offscreen canvases for performance & downsampled inference
  const inferenceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const smootherRefHand1 = useRef<PointSmoother>(new PointSmoother(smoothingFactor));
  const smootherRefHand2 = useRef<PointSmoother>(new PointSmoother(smoothingFactor));
  const activeStrokeRef1 = useRef<Stroke | null>(null);
  const activeStrokeRef2 = useRef<Stroke | null>(null);

  const lastDetectionsRef = useRef<HandDetectionResult[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const fpsRef = useRef<number>(0);
  const lastReactHandUpdateRef = useRef<number>(0);

  // Initialize static offscreen canvas
  if (!staticCanvasRef.current) {
    staticCanvasRef.current = document.createElement('canvas');
  }
  if (!inferenceCanvasRef.current) {
    inferenceCanvasRef.current = document.createElement('canvas');
    inferenceCanvasRef.current.width = 480;
    inferenceCanvasRef.current.height = 360;
  }

  // Update smoother configurations when smoothing factor changes
  useEffect(() => {
    smootherRefHand1.current.setSmoothingFactor(smoothingFactor);
    smootherRefHand2.current.setSmoothingFactor(smoothingFactor);
  }, [smoothingFactor]);

  // Handle Container Resize with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width: Math.round(width), height: Math.round(height) });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Update static canvas buffer when background or strokes change
  const updateStaticBuffer = useCallback(() => {
    const staticCanvas = staticCanvasRef.current;
    if (!staticCanvas || containerSize.width === 0 || containerSize.height === 0) return;

    if (staticCanvas.width !== containerSize.width || staticCanvas.height !== containerSize.height) {
      staticCanvas.width = containerSize.width;
      staticCanvas.height = containerSize.height;
    }

    const ctx = staticCanvas.getContext('2d');
    if (!ctx) return;

    renderBackground(ctx, containerSize.width, containerSize.height, background);

    for (const stroke of strokes) {
      renderStroke(ctx, stroke);
    }
  }, [background, strokes, containerSize]);

  // Redraw main drawing canvas from static buffer + current active strokes (Hand 1 & Hand 2)
  const redrawDrawingCanvas = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    const staticCanvas = staticCanvasRef.current;
    if (!canvas || !staticCanvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(staticCanvas, 0, 0);

    if (activeStrokeRef1.current) {
      renderStroke(ctx, activeStrokeRef1.current);
    }
    if (activeStrokeRef2.current) {
      renderStroke(ctx, activeStrokeRef2.current);
    }
  }, [drawingCanvasRef]);

  // Synchronize canvas resolutions on container resize or background change
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;

    if (canvas && containerSize.width > 0 && containerSize.height > 0) {
      if (canvas.width !== containerSize.width || canvas.height !== containerSize.height) {
        canvas.width = containerSize.width;
        canvas.height = containerSize.height;
      }
    }

    if (overlayCanvas && containerSize.width > 0 && containerSize.height > 0) {
      if (overlayCanvas.width !== containerSize.width || overlayCanvas.height !== containerSize.height) {
        overlayCanvas.width = containerSize.width;
        overlayCanvas.height = containerSize.height;
      }
    }

    updateStaticBuffer();
    redrawDrawingCanvas();
  }, [containerSize, updateStaticBuffer, redrawDrawingCanvas]);

  // Start Camera Stream with optimized frameRate settings
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 60, min: 30 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              resolve(true);
            };
          }
        });
        setIsWebcamStarted(true);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Camera access failed or was denied. Please allow camera permissions to use AirDraw.');
      setIsWebcamStarted(false);
    }
  };

  // Initialize MediaPipe & Start Camera on Mount
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        setIsLoadingModel(true);
        await getHandLandmarker((status) => {
          if (isMounted) setModelStatusText(status);
        });
        if (isMounted) {
          setIsLoadingModel(false);
          await startCamera();
        }
      } catch (err) {
        if (isMounted) {
          setIsLoadingModel(false);
          setCameraError('Could not load Hand Tracking AI module. Please refresh or check connection.');
        }
      }
    }

    init();

    return () => {
      isMounted = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Main Multi-Hand Detection & High-FPS Render Loop
  useEffect(() => {
    if (!isWebcamStarted || isLoadingModel) return;

    let isSubscribed = true;

    async function processVideoFrame() {
      if (!isSubscribed) return;

      const video = videoRef.current;
      const overlayCanvas = overlayCanvasRef.current;

      if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        const now = performance.now();
        frameCountRef.current++;
        if (now - lastFrameTimeRef.current >= 1000) {
          fpsRef.current = frameCountRef.current;
          frameCountRef.current = 0;
          lastFrameTimeRef.current = now;
        }

        try {
          const landmarker = await getHandLandmarker();

          // Direct HTMLVideoElement hardware texture pass to MediaPipe for ultra-high FPS
          const results = landmarker.detectForVideo(video, now);
          const detections: HandDetectionResult[] = [];

          if (results.landmarks && results.landmarks.length > 0) {
            for (let i = 0; i < results.landmarks.length; i++) {
              const rawLandmarks = results.landmarks[i];
              const handednessLabel = results.handedness?.[i]?.[0]?.categoryName;
              const detection = analyzeHandLandmarks(
                rawLandmarks,
                containerSize.width,
                containerSize.height,
                pinchThreshold,
                gestureMode,
                isMirrored,
                handednessLabel
              );
              detections.push(detection);
            }

            const prevDetections = lastDetectionsRef.current;
            lastDetectionsRef.current = detections;

            // Process Hand 1 Stroke
            const det1 = detections[0];
            if (det1 && det1.isDrawing) {
              const rawPt: Point = det1.indexTip;
              const smoothedPt = smootherRefHand1.current.smooth(rawPt);

              if (!activeStrokeRef1.current) {
                const newStroke: Stroke = {
                  id: 'stroke_h1_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                  points: [smoothedPt],
                  color,
                  size: brushSize,
                  opacity,
                  brushType,
                };
                activeStrokeRef1.current = newStroke;
              } else {
                activeStrokeRef1.current.points.push(smoothedPt);
              }
            } else if (activeStrokeRef1.current) {
              const finishedStroke = { ...activeStrokeRef1.current };
              activeStrokeRef1.current = null;
              smootherRefHand1.current.reset();

              const staticCanvas = staticCanvasRef.current;
              if (staticCanvas) {
                const staticCtx = staticCanvas.getContext('2d');
                if (staticCtx) renderStroke(staticCtx, finishedStroke);
              }
              onSaveStrokeToHistory(finishedStroke);
            }

            // Process Hand 2 Stroke
            const det2 = detections[1];
            if (det2 && det2.isDrawing) {
              const rawPt: Point = det2.indexTip;
              const smoothedPt = smootherRefHand2.current.smooth(rawPt);

              if (!activeStrokeRef2.current) {
                const newStroke: Stroke = {
                  id: 'stroke_h2_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                  points: [smoothedPt],
                  color,
                  size: brushSize,
                  opacity,
                  brushType,
                };
                activeStrokeRef2.current = newStroke;
              } else {
                activeStrokeRef2.current.points.push(smoothedPt);
              }
            } else if (activeStrokeRef2.current) {
              const finishedStroke = { ...activeStrokeRef2.current };
              activeStrokeRef2.current = null;
              smootherRefHand2.current.reset();

              const staticCanvas = staticCanvasRef.current;
              if (staticCanvas) {
                const staticCtx = staticCanvas.getContext('2d');
                if (staticCtx) renderStroke(staticCtx, finishedStroke);
              }
              onSaveStrokeToHistory(finishedStroke);
            }

            redrawDrawingCanvas();

            // Throttle React state telemetry to 3Hz or on drawing/gesture state transitions
            const hasDrawingStateChanged =
              !prevDetections[0] ||
              prevDetections[0].isDrawing !== det1.isDrawing ||
              prevDetections[0].gesture !== det1.gesture ||
              prevDetections.length !== detections.length;

            if (hasDrawingStateChanged || now - lastReactHandUpdateRef.current > 350) {
              onHandUpdate(det1 || detections[0], fpsRef.current);
              lastReactHandUpdateRef.current = now;
            }

            // Draw Multi-Hand Overlay Skeletons & Cursors
            if (overlayCanvas) {
              const ctx = overlayCanvas.getContext('2d');
              if (ctx) {
                drawMultiHandOverlay(
                  ctx,
                  detections,
                  containerSize.width,
                  containerSize.height,
                  showSkeleton,
                  isMirrored
                );
              }
            }
          } else {
            // No Hands Detected
            if (activeStrokeRef1.current) {
              const finishedStroke = { ...activeStrokeRef1.current };
              activeStrokeRef1.current = null;
              smootherRefHand1.current.reset();

              const staticCanvas = staticCanvasRef.current;
              if (staticCanvas) {
                const staticCtx = staticCanvas.getContext('2d');
                if (staticCtx) renderStroke(staticCtx, finishedStroke);
              }
              onSaveStrokeToHistory(finishedStroke);
            }

            if (activeStrokeRef2.current) {
              const finishedStroke = { ...activeStrokeRef2.current };
              activeStrokeRef2.current = null;
              smootherRefHand2.current.reset();

              const staticCanvas = staticCanvasRef.current;
              if (staticCanvas) {
                const staticCtx = staticCanvas.getContext('2d');
                if (staticCtx) renderStroke(staticCtx, finishedStroke);
              }
              onSaveStrokeToHistory(finishedStroke);
            }

            redrawDrawingCanvas();

            const emptyDetection: HandDetectionResult = {
              landmarks: [],
              gesture: 'none',
              pinchDistance: 1,
              indexTip: { x: 0, y: 0 },
              thumbTip: { x: 0, y: 0 },
              wrist: { x: 0, y: 0 },
              isDrawing: false,
              handSide: 'Unknown',
            };
            lastDetectionsRef.current = [];
            onHandUpdate(emptyDetection, fpsRef.current);

            if (overlayCanvas) {
              const ctx = overlayCanvas.getContext('2d');
              if (ctx) ctx.clearRect(0, 0, containerSize.width, containerSize.height);
            }
          }
        } catch (err) {
          console.warn('Frame processing glitch:', err);
        }
      }

      animFrameIdRef.current = requestAnimationFrame(processVideoFrame);
    }

    animFrameIdRef.current = requestAnimationFrame(processVideoFrame);

    return () => {
      isSubscribed = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [
    isWebcamStarted,
    isLoadingModel,
    containerSize,
    pinchThreshold,
    gestureMode,
    isMirrored,
    color,
    brushSize,
    opacity,
    brushType,
    showSkeleton,
    onHandUpdate,
    onSaveStrokeToHistory,
    redrawDrawingCanvas,
  ]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden select-none"
    >
      {/* Background Video Element (Mirrored if set) */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-200 ${
          isMirrored ? 'scale-x-[-1]' : ''
        } ${background === 'transparent' ? 'opacity-100' : 'opacity-15 blur-sm pointer-events-none'}`}
      />

      {/* Main Drawing Canvas */}
      <canvas
        ref={drawingCanvasRef}
        className="absolute inset-0 w-full h-full touch-none z-10"
      />

      {/* Hand Skeleton Overlay & Cursor Canvas */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
      />

      {/* Virtual Air Touch Hotspots */}
      {showAirButtons && lastDetectionsRef.current.length > 0 && (
        <AirButtonsOverlay
          indexTip={lastDetectionsRef.current[0].indexTip}
          hasHand={lastDetectionsRef.current[0].landmarks.length > 0}
          onClear={onClearCanvas}
          onUndo={onUndo}
          onSnapshot={onSnapshot}
          onChangeColor={onChangeColor}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
        />
      )}

      {/* Loading Overlay */}
      {isLoadingModel && (
        <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Loading AirDraw Neural AI</h2>
            <p className="text-xs text-slate-400 font-mono mt-1">{modelStatusText}</p>
          </div>
        </div>
      )}

      {/* Camera Error Modal */}
      {cameraError && !isLoadingModel && (
        <div className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Camera Access Required</h2>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">{cameraError}</p>
          </div>
          <button
            onClick={startCamera}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-cyan-500/20 flex items-center gap-2"
          >
            <Camera className="w-4 h-4" /> Grant Camera Permission & Retry
          </button>
        </div>
      )}
    </div>
  );
};
