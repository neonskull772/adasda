import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { HandLandmarker } from '@mediapipe/tasks-vision';
import {
  BrushType,
  CanvasBackground,
  GestureMode,
  GestureType,
  HandDetectionResult,
  Point,
  Stroke,
} from '../types';
import {
  analyzeHandLandmarks,
  PointSmoother,
  LandmarksSmoother,
  getConnectedStrokeGroup,
  rotateStrokesGroup,
  translateStrokesGroup,
} from '../utils/handGesture';
import { drawMultiHandOverlay, renderBackground, renderStroke } from '../utils/canvasRenderer';
import { getHandLandmarker } from '../utils/mediaPipeService';
import { AirButtonsOverlay } from './AirButtonsOverlay';
import { recognizeAndSmoothShape } from '../utils/shapeRecognizer';
import { Camera, CameraOff, RefreshCw, AlertTriangle, Fullscreen, ExternalLink } from 'lucide-react';

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
  enableMagicShapes?: boolean;
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
  enableMagicShapes = false,
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

  const smootherRefLeft = useRef<PointSmoother>(new PointSmoother(smoothingFactor));
  const smootherRefRight = useRef<PointSmoother>(new PointSmoother(smoothingFactor));
  const landmarksSmootherRefLeft = useRef<LandmarksSmoother>(new LandmarksSmoother());
  const landmarksSmootherRefRight = useRef<LandmarksSmoother>(new LandmarksSmoother());
  const activeStrokesRef = useRef<{ Left: Stroke | null; Right: Stroke | null }>({ Left: null, Right: null });

  const grippedStrokeIdsRef = useRef<Set<string>>(new Set());
  const lastGripPosRef = useRef<Point | null>(null);
  const gripGraceCountRef = useRef<number>(0);
  const strokesRef = useRef<Stroke[]>(strokes);

  const lastDetectionsRef = useRef<HandDetectionResult[]>([]);
  const lastVideoTimeRef = useRef<number>(-1);
  const animFrameIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const fpsRef = useRef<number>(0);
  const [activeHand, setActiveHand] = useState<{ indexTip: Point | null; hasHand: boolean }>({
    indexTip: null,
    hasHand: false,
  });
  const lastAirButtonUpdateRef = useRef<number>(0);
  const lastReactHandUpdateRef = useRef<number>(0);

  const offscreenStrokesCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const backgroundRef = useRef<CanvasBackground>(background);
  const colorRef = useRef<string>(color);
  const brushSizeRef = useRef<number>(brushSize);
  const opacityRef = useRef<number>(opacity);
  const brushTypeRef = useRef<BrushType>(brushType);
  const gestureModeRef = useRef<GestureMode>(gestureMode);
  const isMirroredRef = useRef<boolean>(isMirrored);
  const showSkeletonRef = useRef<boolean>(showSkeleton);
  const showAirButtonsRef = useRef<boolean>(showAirButtons);
  const enableMagicShapesRef = useRef<boolean>(enableMagicShapes);

  useEffect(() => { backgroundRef.current = background; }, [background]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { opacityRef.current = opacity; }, [opacity]);
  useEffect(() => { brushTypeRef.current = brushType; }, [brushType]);
  useEffect(() => { gestureModeRef.current = gestureMode; }, [gestureMode]);
  useEffect(() => { isMirroredRef.current = isMirrored; }, [isMirrored]);
  useEffect(() => { showSkeletonRef.current = showSkeleton; }, [showSkeleton]);
  useEffect(() => { showAirButtonsRef.current = showAirButtons; }, [showAirButtons]);
  useEffect(() => { enableMagicShapesRef.current = enableMagicShapes; }, [enableMagicShapes]);

  // Immediately repaint static buffer and redraw when background style changes
  useEffect(() => {
    updateStaticBuffer();
    redrawDrawingCanvas();
  }, [background]);

  // Initialize static offscreen canvas
  if (!staticCanvasRef.current) {
    staticCanvasRef.current = document.createElement('canvas');
  }
  if (!inferenceCanvasRef.current) {
    inferenceCanvasRef.current = document.createElement('canvas');
    inferenceCanvasRef.current.width = 480;
    inferenceCanvasRef.current.height = 360;
  }
  if (!offscreenStrokesCanvasRef.current) {
    offscreenStrokesCanvasRef.current = document.createElement('canvas');
  }

  // Update smoother configurations when smoothing factor changes
  useEffect(() => {
    smootherRefLeft.current.setSmoothingFactor(smoothingFactor);
    smootherRefRight.current.setSmoothingFactor(smoothingFactor);
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
  const updateStaticBuffer = useCallback((customStrokes?: Stroke[]) => {
    const staticCanvas = staticCanvasRef.current;
    if (!staticCanvas || containerSize.width === 0 || containerSize.height === 0) return;

    if (staticCanvas.width !== containerSize.width || staticCanvas.height !== containerSize.height) {
      staticCanvas.width = containerSize.width;
      staticCanvas.height = containerSize.height;
    }

    const ctx = staticCanvas.getContext('2d');
    if (!ctx) return;

    const currentBg = backgroundRef.current;
    renderBackground(ctx, containerSize.width, containerSize.height, currentBg);

    const strokeList = customStrokes !== undefined ? customStrokes : strokesRef.current;
    if (strokeList.length === 0) return;

    if (currentBg === 'transparent') {
      for (const stroke of strokeList) {
        renderStroke(ctx, stroke);
      }
    } else {
      const tempCanvas = offscreenStrokesCanvasRef.current;
      if (tempCanvas) {
        if (tempCanvas.width !== containerSize.width || tempCanvas.height !== containerSize.height) {
          tempCanvas.width = containerSize.width;
          tempCanvas.height = containerSize.height;
        }
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.clearRect(0, 0, containerSize.width, containerSize.height);
          for (const stroke of strokeList) {
            renderStroke(tempCtx, stroke);
          }
          ctx.drawImage(tempCanvas, 0, 0);
        }
      }
    }
  }, [containerSize]);

  // Redraw main drawing canvas from static buffer + current active strokes (Left & Right hands)
  const redrawDrawingCanvas = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    const staticCanvas = staticCanvasRef.current;
    if (!canvas || !staticCanvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(staticCanvas, 0, 0);

    if (activeStrokesRef.current.Left) {
      renderStroke(ctx, activeStrokesRef.current.Left);
    }
    if (activeStrokesRef.current.Right) {
      renderStroke(ctx, activeStrokesRef.current.Right);
    }
  }, [drawingCanvasRef]);

  useEffect(() => {
    strokesRef.current = strokes;
    grippedStrokeIdsRef.current.clear();
    lastGripPosRef.current = null;

    // Reset active strokes only when the entire canvas is cleared
    if (strokes.length === 0) {
      activeStrokesRef.current = { Left: null, Right: null };
      smootherRefLeft.current.reset();
      smootherRefRight.current.reset();
    }

    updateStaticBuffer(strokes);
    redrawDrawingCanvas();
  }, [strokes, updateStaticBuffer, redrawDrawingCanvas]);

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

  // Start Camera Stream with high FPS settings & fallback
  const startCamera = async () => {
    setCameraError(null);
    let stream: MediaStream | null = null;
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 60, min: 30 },
            facingMode: 'user',
          },
          audio: false,
        });
      } catch (firstErr) {
        console.warn('Ideal camera constraints failed, attempting fallback to default video device:', firstErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      if (videoRef.current && stream) {
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
      const errName = err?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError('Camera access was denied by your browser. Please allow camera permissions in your browser settings or click the camera icon in your URL address bar.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError('No camera device was detected. Please connect a webcam and try again.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraError('Your camera is currently in use by another application. Please close other camera apps and retry.');
      } else {
        setCameraError(`Camera access error: ${err?.message || 'Permission denied or frame restricted.'}`);
      }
      setIsWebcamStarted(false);
    }
  };

  // Initialize MediaPipe & Start Camera on Mount
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        setIsLoadingModel(true);
        const lmInstance = await getHandLandmarker((status) => {
          if (isMounted) setModelStatusText(status);
        });
        landmarkerRef.current = lmInstance;
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

  // Main Multi-Hand Detection & Maximum FPS Render Loop
  useEffect(() => {
    if (!isWebcamStarted || isLoadingModel) return;

    let isSubscribed = true;

    function processVideoFrame() {
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
          // Direct synchronous WebGL pass when new camera video frame arrives
          if (video.currentTime !== lastVideoTimeRef.current && landmarkerRef.current) {
            lastVideoTimeRef.current = video.currentTime;
            const results = landmarkerRef.current.detectForVideo(video, now);
            const newDetections: HandDetectionResult[] = [];

            if (results.landmarks && results.landmarks.length > 0) {
              let rawLandmarksList = results.landmarks;
              if (rawLandmarksList.length >= 2) {
                const copy = [...rawLandmarksList];
                copy.sort((a, b) => (a[8]?.x || 0) - (b[8]?.x || 0));
                rawLandmarksList = copy;
              }

              for (let i = 0; i < rawLandmarksList.length; i++) {
                const rawLandmarks = rawLandmarksList[i];
                const lmSmoother = i === 0 ? landmarksSmootherRefLeft.current : landmarksSmootherRefRight.current;
                const smoothedLandmarks = lmSmoother.smooth(rawLandmarks);
                const handednessLabel = results.handedness?.[i]?.[0]?.categoryName;

                const detection = analyzeHandLandmarks(
                  smoothedLandmarks,
                  containerSize.width,
                  containerSize.height,
                  pinchThreshold,
                  gestureMode,
                  isMirrored,
                  handednessLabel
                );
                newDetections.push(detection);
              }
            }
            lastDetectionsRef.current = newDetections;
          }

          const detections = lastDetectionsRef.current;

          if (detections && detections.length > 0) {

            // Check for Fist Grip Stroke Movement
            const fistDetection = detections.find(
              (d) => d.gesture === 'fist' || (gestureMode === 'fist_grip' && d.isDrawing)
            );

            if (fistDetection) {
              gripGraceCountRef.current = 0;
              const gripPos = fistDetection.indexTip;

              // If not already gripping a group, find nearest stroke and form connected cluster
              if (grippedStrokeIdsRef.current.size === 0) {
                let minDist = Infinity;
                let nearestId: string | null = null;
                for (const stroke of strokesRef.current) {
                  for (const pt of stroke.points) {
                    const dist = Math.hypot(pt.x - gripPos.x, pt.y - gripPos.y);
                    if (dist < minDist) {
                      minDist = dist;
                      nearestId = stroke.id;
                    }
                  }
                }
                if (minDist <= 140 && nearestId) {
                  const group = getConnectedStrokeGroup(nearestId, strokesRef.current);
                  const groupIds = new Set(group.map((s) => s.id));
                  grippedStrokeIdsRef.current = groupIds;
                  lastGripPosRef.current = { ...gripPos };
                }
              }

              if (grippedStrokeIdsRef.current.size > 0 && lastGripPosRef.current) {
                const dx = gripPos.x - lastGripPosRef.current.x;
                const dy = gripPos.y - lastGripPosRef.current.y;

                if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
                  translateStrokesGroup(strokesRef.current, grippedStrokeIdsRef.current, dx, dy);
                  lastGripPosRef.current = { ...gripPos };
                  updateStaticBuffer(strokesRef.current);
                }
              }
            } else if (grippedStrokeIdsRef.current.size > 0) {
              // Grace period: allow 8 transient frames before releasing grip
              gripGraceCountRef.current += 1;
              if (gripGraceCountRef.current >= 8) {
                grippedStrokeIdsRef.current.clear();
                lastGripPosRef.current = null;
                gripGraceCountRef.current = 0;
                setStrokes([...strokesRef.current]);
                updateStaticBuffer(strokesRef.current);
              }
            }

            // Map detections to Left and Right hand sides
            let leftDet: HandDetectionResult | null = null;
            let rightDet: HandDetectionResult | null = null;

            if (detections.length === 1) {
              const d = detections[0];
              if (d.handSide === 'Left') {
                leftDet = d;
              } else if (d.handSide === 'Right') {
                rightDet = d;
              } else if (activeStrokesRef.current.Left && !activeStrokesRef.current.Right) {
                leftDet = d;
              } else if (activeStrokesRef.current.Right && !activeStrokesRef.current.Left) {
                rightDet = d;
              } else if (d.indexTip.x < containerSize.width / 2) {
                leftDet = d;
              } else {
                rightDet = d;
              }
            } else if (detections.length >= 2) {
              const d0 = detections[0];
              const d1 = detections[1];
              if (d0.indexTip.x <= d1.indexTip.x) {
                leftDet = d0;
                rightDet = d1;
              } else {
                leftDet = d1;
                rightDet = d0;
              }
            }

            const processSideStroke = (side: 'Left' | 'Right', det: HandDetectionResult | null) => {
              const smoother = side === 'Left' ? smootherRefLeft.current : smootherRefRight.current;

              if (det && det.isDrawing) {
                const rawPt: Point = det.indexTip;
                const smoothedPt = smoother.smooth(rawPt);

                if (!activeStrokesRef.current[side]) {
                  const newStroke: Stroke = {
                    id: `stroke_${side}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                    points: [smoothedPt],
                    color: colorRef.current,
                    size: brushSizeRef.current,
                    opacity: opacityRef.current,
                    brushType: brushTypeRef.current,
                  };
                  activeStrokesRef.current[side] = newStroke;
                } else {
                  activeStrokesRef.current[side]!.points.push(smoothedPt);
                }
              } else if (activeStrokesRef.current[side]) {
                let finishedStroke = { ...activeStrokesRef.current[side]! };
                activeStrokesRef.current[side] = null;
                smoother.reset();
                if (finishedStroke.points.length > 0) {
                  if (enableMagicShapesRef.current) {
                    finishedStroke = recognizeAndSmoothShape(finishedStroke);
                  }
                  strokesRef.current = [...strokesRef.current, finishedStroke];
                  updateStaticBuffer(strokesRef.current);
                  onSaveStrokeToHistory(finishedStroke);
                }
              }
            };

            processSideStroke('Left', leftDet);
            processSideStroke('Right', rightDet);

            redrawDrawingCanvas();

            // Throttle React state telemetry to 3Hz or when drawing
            const isDrawingNow = Boolean((leftDet && leftDet.isDrawing) || (rightDet && rightDet.isDrawing));
            if (isDrawingNow || now - lastReactHandUpdateRef.current > 300) {
              onHandUpdate(leftDet || rightDet || detections[0], fpsRef.current);
              lastReactHandUpdateRef.current = now;
            }

            if (showAirButtonsRef.current && now - lastAirButtonUpdateRef.current > 40) {
              const d0 = detections[0];
              setActiveHand({
                indexTip: d0?.indexTip || null,
                hasHand: Boolean(d0 && d0.landmarks.length > 0),
              });
              lastAirButtonUpdateRef.current = now;
            }

            // Draw Multi-Hand Overlay Skeletons & Cursors
            const grippedStrokes = strokesRef.current.filter((s) => grippedStrokeIdsRef.current.has(s.id));
            if (overlayCanvas) {
              const ctx = overlayCanvas.getContext('2d');
              if (ctx) {
                drawMultiHandOverlay(
                  ctx,
                  detections,
                  containerSize.width,
                  containerSize.height,
                  showSkeletonRef.current,
                  isMirroredRef.current,
                  grippedStrokes
                );
              }
            }
          } else {
            // No Hands Detected - reset landmark smoothers and finalize active strokes
            landmarksSmootherRefLeft.current.reset();
            landmarksSmootherRefRight.current.reset();
            if (grippedStrokeIdsRef.current.size > 0) {
              gripGraceCountRef.current += 1;
              if (gripGraceCountRef.current >= 8) {
                grippedStrokeIdsRef.current.clear();
                lastGripPosRef.current = null;
                gripGraceCountRef.current = 0;
                setStrokes([...strokesRef.current]);
                updateStaticBuffer(strokesRef.current);
              }
            }

            const finishActiveSide = (side: 'Left' | 'Right') => {
              if (activeStrokesRef.current[side]) {
                let finishedStroke = { ...activeStrokesRef.current[side]! };
                activeStrokesRef.current[side] = null;
                const smoother = side === 'Left' ? smootherRefLeft.current : smootherRefRight.current;
                smoother.reset();
                if (finishedStroke.points.length > 0) {
                  if (enableMagicShapesRef.current) {
                    finishedStroke = recognizeAndSmoothShape(finishedStroke);
                  }
                  strokesRef.current = [...strokesRef.current, finishedStroke];
                  updateStaticBuffer(strokesRef.current);
                  onSaveStrokeToHistory(finishedStroke);
                }
              }
            };

            finishActiveSide('Left');
            finishActiveSide('Right');

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
            setActiveHand((prev) => (prev.hasHand ? { indexTip: null, hasHand: false } : prev));

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
      {showAirButtons && (
        <AirButtonsOverlay
          indexTip={activeHand.indexTip}
          hasHand={activeHand.hasHand}
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
        <div className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md mx-auto my-auto rounded-3xl border border-rose-500/20 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Camera Permission Required</h2>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">{cameraError}</p>
            <p className="text-[11px] text-slate-400 mt-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              💡 <strong className="text-slate-200">Tip:</strong> If using an embedded window or preview iframe, open the app in a new tab to grant camera permission directly.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full pt-1">
            <button
              onClick={startCamera}
              className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" /> Grant Permission & Retry
            </button>
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition border border-slate-700 flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" /> Open in New Tab
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
