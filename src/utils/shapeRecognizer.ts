import { Point, Stroke } from '../types';

export function recognizeAndSmoothShape(stroke: Stroke): Stroke {
  if (!stroke.points || stroke.points.length < 6) return stroke;

  const pts = stroke.points;
  const start = pts[0];
  const end = pts[pts.length - 1];

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const diag = Math.sqrt(width * width + height * height);

  if (diag < 10) return stroke; // Too small / speck

  const startEndDist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));

  // 1. Check for Straight Line
  let maxLineDev = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const dev = pointToSegmentDistance(pts[i], start, end);
    maxLineDev = Math.max(maxLineDev, dev);
  }

  if (startEndDist > diag * 0.75 && maxLineDev < Math.max(10, diag * 0.08)) {
    // Recognized as a straight line
    return {
      ...stroke,
      points: [start, end],
    };
  }

  // 2. Check for Closed Geometric Shapes (Circle, Rectangle)
  const isClosed = startEndDist < Math.max(30, diag * 0.3);

  if (isClosed && pts.length >= 10) {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = width / 2;
    const ry = height / 2;

    // Check Circle/Ellipse fit score
    let totalRadiusErr = 0;
    for (const p of pts) {
      const nx = (p.x - cx) / (rx || 1);
      const ny = (p.y - cy) / (ry || 1);
      const distNorm = Math.sqrt(nx * nx + ny * ny);
      totalRadiusErr += Math.abs(distNorm - 1);
    }
    const avgCircleErr = totalRadiusErr / pts.length;

    // Smooth Circle/Ellipse (< 0.18 variance error)
    if (avgCircleErr < 0.18) {
      const smoothCirclePts: Point[] = [];
      const numSteps = 36;
      for (let i = 0; i <= numSteps; i++) {
        const angle = (i / numSteps) * Math.PI * 2;
        smoothCirclePts.push({
          x: cx + Math.cos(angle) * rx,
          y: cy + Math.sin(angle) * ry,
        });
      }
      return {
        ...stroke,
        points: smoothCirclePts,
      };
    }

    // Check Rectangle fit score (distance from points to bounding box edges)
    let totalRectEdgeErr = 0;
    for (const p of pts) {
      const distToLeft = Math.abs(p.x - minX);
      const distToRight = Math.abs(p.x - maxX);
      const distToTop = Math.abs(p.y - minY);
      const distToBottom = Math.abs(p.y - maxY);
      const minDistToEdge = Math.min(distToLeft, distToRight, distToTop, distToBottom);
      totalRectEdgeErr += minDistToEdge;
    }
    const avgRectErr = totalRectEdgeErr / pts.length;

    // Smooth Rectangle (< 12% diagonal distance from box perimeter)
    if (avgRectErr < Math.max(8, diag * 0.12)) {
      const rectPts: Point[] = [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
        { x: minX, y: minY },
      ];
      return {
        ...stroke,
        points: rectPts,
      };
    }
  }

  // 3. Fallback for Freehand Drawings, Doodles & Curves:
  // Apply gentle path smoothing so drawings NEVER disappear or get replaced unexpectedly!
  return {
    ...stroke,
    points: smoothPathPoints(pts),
  };
}

function smoothPathPoints(points: Point[]): Point[] {
  if (points.length <= 3) return points;
  const smoothed: Point[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    smoothed.push({
      x: prev.x * 0.2 + curr.x * 0.6 + next.x * 0.2,
      y: prev.y * 0.2 + curr.y * 0.6 + next.y * 0.2,
    });
  }

  smoothed.push(points[points.length - 1]);
  return smoothed;
}

function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const l2 = Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2);
  if (l2 === 0) return Math.sqrt(Math.pow(p.x - a.x, 2) + Math.pow(p.y - a.y, 2));
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * (b.x - a.x);
  const projY = a.y + t * (b.y - a.y);
  return Math.sqrt(Math.pow(p.x - projX, 2) + Math.pow(p.y - projY, 2));
}
