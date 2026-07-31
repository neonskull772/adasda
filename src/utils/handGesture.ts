import { GestureType, HandDetectionResult, HandLandmark, Point } from '../types';

export function euclideanDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function euclideanDistance3D(p1: HandLandmark, p2: HandLandmark): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function analyzeHandLandmarks(
  landmarks: HandLandmark[],
  videoWidth: number,
  videoHeight: number,
  pinchThreshold: number = 0.08,
  gestureMode: 'pinch' | 'pointing' | 'peace_hover' = 'pinch',
  isMirrored: boolean = true
): HandDetectionResult {
  if (!landmarks || landmarks.length < 21) {
    return {
      landmarks: [],
      gesture: 'none',
      pinchDistance: 1,
      indexTip: { x: 0, y: 0 },
      thumbTip: { x: 0, y: 0 },
      wrist: { x: 0, y: 0 },
      isDrawing: false,
      handSide: 'Unknown',
    };
  }

  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexMcp = landmarks[5];
  const indexPip = landmarks[6];
  const indexTip = landmarks[8];
  const middleMcp = landmarks[9];
  const middlePip = landmarks[10];
  const middleTip = landmarks[12];
  const ringMcp = landmarks[13];
  const ringPip = landmarks[14];
  const ringTip = landmarks[16];
  const pinkyMcp = landmarks[17];
  const pinkyPip = landmarks[18];
  const pinkyTip = landmarks[20];

  // Scale factor based on wrist to middle MCP distance (hand size in 2D)
  const handScale = Math.max(0.01, euclideanDistance(wrist, middleMcp));

  // Normalized distance between thumb tip and index tip
  const rawPinchDist = euclideanDistance(thumbTip, indexTip);
  const normalizedPinchDist = rawPinchDist / handScale;

  // Finger extension checks
  const isIndexExtended = euclideanDistance(indexTip, wrist) > euclideanDistance(indexPip, wrist);
  const isMiddleExtended = euclideanDistance(middleTip, wrist) > euclideanDistance(middlePip, wrist);
  const isRingExtended = euclideanDistance(ringTip, wrist) > euclideanDistance(ringPip, wrist);
  const isPinkyExtended = euclideanDistance(pinkyTip, wrist) > euclideanDistance(pinkyPip, wrist);

  const extendedFingersCount =
    (isIndexExtended ? 1 : 0) +
    (isMiddleExtended ? 1 : 0) +
    (isRingExtended ? 1 : 0) +
    (isPinkyExtended ? 1 : 0);

  let gesture: GestureType = 'none';

  if (normalizedPinchDist < pinchThreshold) {
    gesture = 'pinch';
  } else if (extendedFingersCount >= 4) {
    gesture = 'open_palm';
  } else if (extendedFingersCount === 0) {
    gesture = 'fist';
  } else if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
    gesture = 'peace';
  } else if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
    gesture = 'pointing';
  }

  // Determine drawing state according to active mode
  let isDrawing = false;
  if (gestureMode === 'pinch') {
    isDrawing = gesture === 'pinch';
  } else if (gestureMode === 'pointing') {
    isDrawing = gesture === 'pointing' || gesture === 'pinch';
  } else if (gestureMode === 'peace_hover') {
    // Peace sign hovers, pointing finger draws
    isDrawing = gesture === 'pointing';
  }

  // Calculate pixel coordinates for Index Tip (mirror horizontal if needed)
  const indexPixelX = isMirrored ? (1 - indexTip.x) * videoWidth : indexTip.x * videoWidth;
  const indexPixelY = indexTip.y * videoHeight;

  const thumbPixelX = isMirrored ? (1 - thumbTip.x) * videoWidth : thumbTip.x * videoWidth;
  const thumbPixelY = thumbTip.y * videoHeight;

  const wristPixelX = isMirrored ? (1 - wrist.x) * videoWidth : wrist.x * videoWidth;
  const wristPixelY = wrist.y * videoHeight;

  return {
    landmarks,
    gesture,
    pinchDistance: normalizedPinchDist,
    indexTip: { x: indexPixelX, y: indexPixelY },
    thumbTip: { x: thumbPixelX, y: thumbPixelY },
    wrist: { x: wristPixelX, y: wristPixelY },
    isDrawing,
    handSide: landmarks[17].x < landmarks[5].x ? 'Right' : 'Left',
  };
}

export class PointSmoother {
  private prevPoint: Point | null = null;
  private smoothingFactor: number;

  constructor(smoothingFactor: number = 0.35) {
    this.smoothingFactor = Math.max(0.05, Math.min(1, smoothingFactor));
  }

  public setSmoothingFactor(factor: number) {
    this.smoothingFactor = Math.max(0.05, Math.min(1, factor));
  }

  public smooth(currentPoint: Point): Point {
    if (!this.prevPoint) {
      this.prevPoint = { ...currentPoint };
      return currentPoint;
    }

    const smoothed: Point = {
      x: this.prevPoint.x + (currentPoint.x - this.prevPoint.x) * this.smoothingFactor,
      y: this.prevPoint.y + (currentPoint.y - this.prevPoint.y) * this.smoothingFactor,
      pressure: currentPoint.pressure,
      timestamp: currentPoint.timestamp || Date.now(),
    };

    this.prevPoint = smoothed;
    return smoothed;
  }

  public reset() {
    this.prevPoint = null;
  }
}
