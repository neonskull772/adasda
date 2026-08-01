import { GestureType, HandDetectionResult, HandLandmark, Point, Stroke } from '../types';

export function doStrokesIntersect(s1: Stroke, s2: Stroke, threshold: number = 25): boolean {
  if (!s1.points || !s2.points || !s1.points.length || !s2.points.length) return false;

  let minX1 = Infinity, maxX1 = -Infinity, minY1 = Infinity, maxY1 = -Infinity;
  for (let i = 0; i < s1.points.length; i++) {
    const p = s1.points[i];
    if (p.x < minX1) minX1 = p.x;
    if (p.x > maxX1) maxX1 = p.x;
    if (p.y < minY1) minY1 = p.y;
    if (p.y > maxY1) maxY1 = p.y;
  }

  let minX2 = Infinity, maxX2 = -Infinity, minY2 = Infinity, maxY2 = -Infinity;
  for (let i = 0; i < s2.points.length; i++) {
    const p = s2.points[i];
    if (p.x < minX2) minX2 = p.x;
    if (p.x > maxX2) maxX2 = p.x;
    if (p.y < minY2) minY2 = p.y;
    if (p.y > maxY2) maxY2 = p.y;
  }

  const effectiveThreshold = threshold + Math.max(s1.size || 5, s2.size || 5) / 2;

  if (
    maxX1 + effectiveThreshold < minX2 ||
    minX2 - effectiveThreshold > maxX1 ||
    maxY1 + effectiveThreshold < minY2 ||
    minY2 - effectiveThreshold > maxY1
  ) {
    return false;
  }

  const step1 = Math.max(1, Math.floor(s1.points.length / 40));
  const step2 = Math.max(1, Math.floor(s2.points.length / 40));

  const threshSq = effectiveThreshold * effectiveThreshold;

  for (let i = 0; i < s1.points.length; i += step1) {
    const p1 = s1.points[i];
    for (let j = 0; j < s2.points.length; j += step2) {
      const p2 = s2.points[j];
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      if (dx * dx + dy * dy <= threshSq) {
        return true;
      }
    }
  }

  return false;
}

export function getConnectedStrokeGroup(startStrokeId: string, allStrokes: Stroke[]): Stroke[] {
  const startStroke = allStrokes.find((s) => s.id === startStrokeId);
  if (!startStroke) return [];

  const visited = new Set<string>([startStrokeId]);
  const queue: Stroke[] = [startStroke];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const other of allStrokes) {
      if (!visited.has(other.id)) {
        if (doStrokesIntersect(current, other)) {
          visited.add(other.id);
          queue.push(other);
        }
      }
    }
  }

  return allStrokes.filter((s) => visited.has(s.id));
}

export function rotateStrokesGroup(
  strokes: Stroke[],
  strokeIds: Set<string>,
  pivot: Point,
  angleRad: number
) {
  if (angleRad === 0 || strokeIds.size === 0) return;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  for (let i = 0; i < strokes.length; i++) {
    const s = strokes[i];
    if (strokeIds.has(s.id)) {
      for (let j = 0; j < s.points.length; j++) {
        const pt = s.points[j];
        const rx = pt.x - pivot.x;
        const ry = pt.y - pivot.y;
        pt.x = pivot.x + (rx * cosA - ry * sinA);
        pt.y = pivot.y + (rx * sinA + ry * cosA);
      }
    }
  }
}

export function translateStrokesGroup(
  strokes: Stroke[],
  strokeIds: Set<string>,
  dx: number,
  dy: number
) {
  if ((dx === 0 && dy === 0) || strokeIds.size === 0) return;
  for (let i = 0; i < strokes.length; i++) {
    const s = strokes[i];
    if (strokeIds.has(s.id)) {
      for (let j = 0; j < s.points.length; j++) {
        s.points[j].x += dx;
        s.points[j].y += dy;
      }
    }
  }
}

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
  isMirrored: boolean = true,
  handednessLabel?: string
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

  // Check curled fingers for fist detection
  const indexWristDist = euclideanDistance(indexTip, wrist) / handScale;
  const middleWristDist = euclideanDistance(middleTip, wrist) / handScale;
  const ringWristDist = euclideanDistance(ringTip, wrist) / handScale;
  const pinkyWristDist = euclideanDistance(pinkyTip, wrist) / handScale;

  const curledCount =
    (indexWristDist < 1.65 ? 1 : 0) +
    (middleWristDist < 1.65 ? 1 : 0) +
    (ringWristDist < 1.65 ? 1 : 0) +
    (pinkyWristDist < 1.65 ? 1 : 0);

  let gesture: GestureType = 'none';

  if (normalizedPinchDist < pinchThreshold) {
    gesture = 'pinch';
  } else if (curledCount >= 3 || extendedFingersCount === 0) {
    gesture = 'fist';
  } else if (extendedFingersCount >= 4) {
    gesture = 'open_palm';
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

  let handSide: 'Left' | 'Right' | 'Unknown' = 'Unknown';
  if (handednessLabel) {
    if (handednessLabel.toLowerCase().includes('left')) handSide = isMirrored ? 'Right' : 'Left';
    else if (handednessLabel.toLowerCase().includes('right')) handSide = isMirrored ? 'Left' : 'Right';
  } else {
    handSide = landmarks[17].x < landmarks[5].x ? 'Right' : 'Left';
  }

  return {
    landmarks,
    gesture,
    pinchDistance: normalizedPinchDist,
    indexTip: { x: indexPixelX, y: indexPixelY },
    thumbTip: { x: thumbPixelX, y: thumbPixelY },
    wrist: { x: wristPixelX, y: wristPixelY },
    isDrawing,
    handSide,
  };
}

export class PointSmoother {
  private prevPoint: Point | null = null;
  private baseFactor: number;

  constructor(baseFactor: number = 0.4) {
    this.baseFactor = Math.max(0.05, Math.min(1, baseFactor));
  }

  public setSmoothingFactor(factor: number) {
    this.baseFactor = Math.max(0.05, Math.min(1, factor));
  }

  public smooth(currentPoint: Point): Point {
    if (!this.prevPoint) {
      this.prevPoint = { ...currentPoint };
      return currentPoint;
    }

    const dist = euclideanDistance(currentPoint, this.prevPoint);
    // Velocity adaptive alpha: boost responsiveness when hand moves fast (>15px)
    const velocityFactor = Math.min(0.85, this.baseFactor + Math.min(0.5, dist / 30));

    const smoothed: Point = {
      x: this.prevPoint.x + (currentPoint.x - this.prevPoint.x) * velocityFactor,
      y: this.prevPoint.y + (currentPoint.y - this.prevPoint.y) * velocityFactor,
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

export class LandmarksSmoother {
  private prevLandmarks: HandLandmark[] | null = null;

  public smooth(rawLandmarks: HandLandmark[]): HandLandmark[] {
    if (!rawLandmarks || rawLandmarks.length < 21) return rawLandmarks;
    if (!this.prevLandmarks || this.prevLandmarks.length !== rawLandmarks.length) {
      this.prevLandmarks = rawLandmarks.map((lm) => ({ ...lm }));
      return rawLandmarks;
    }

    const smoothed: HandLandmark[] = new Array(rawLandmarks.length);
    for (let i = 0; i < rawLandmarks.length; i++) {
      const prev = this.prevLandmarks[i];
      const curr = rawLandmarks[i];

      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const dz = (curr.z || 0) - (prev.z || 0);
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Velocity-adaptive alpha: stable when still, instant when moving
      const alpha = Math.min(0.92, 0.42 + Math.min(0.50, dist * 15));

      smoothed[i] = {
        x: prev.x + (curr.x - prev.x) * alpha,
        y: prev.y + (curr.y - prev.y) * alpha,
        z: prev.z !== undefined && curr.z !== undefined ? prev.z + (curr.z - prev.z) * alpha : curr.z,
      };
    }

    this.prevLandmarks = smoothed;
    return smoothed;
  }

  public reset() {
    this.prevLandmarks = null;
  }
}
