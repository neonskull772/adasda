import { Point, Stroke } from '../types';

export function recognizeAndSmoothShape(stroke: Stroke): Stroke {
  if (!stroke.points || stroke.points.length < 8) return stroke;

  const pts = stroke.points;
  const start = pts[0];
  const end = pts[pts.length - 1];

  // Calculate bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let totalDist = 0;

  for (let i = 0; i < pts.length; i++) {
    minX = Math.min(minX, pts[i].x);
    maxX = Math.max(maxX, pts[i].x);
    minY = Math.min(minY, pts[i].y);
    maxY = Math.max(maxY, pts[i].y);
    if (i > 0) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      totalDist += Math.sqrt(dx * dx + dy * dy);
    }
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const diag = Math.sqrt(width * width + height * height);

  if (diag < 15) return stroke; // Too small

  const startEndDist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));

  // 1. Check for Straight Line
  // Max deviation from straight line connecting start and end
  let maxLineDeviation = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const dev = pointToSegmentDistance(pts[i], start, end);
    maxLineDeviation = Math.max(maxLineDeviation, dev);
  }

  if (startEndDist > diag * 0.7 && maxLineDeviation < Math.max(12, diag * 0.08)) {
    // Recognize as Straight Line
    return {
      ...stroke,
      points: [start, end],
    };
  }

  // 2. Check for Circle / Ellipse (Closed loop)
  if (startEndDist < Math.max(25, diag * 0.25) && pts.length >= 12) {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = width / 2;
    const ry = height / 2;

    // Calculate variance of normalized radius
    let radiusVariance = 0;
    for (const p of pts) {
      const nx = (p.x - cx) / (rx || 1);
      const ny = (p.y - cy) / (ry || 1);
      const normRadius = Math.sqrt(nx * nx + ny * ny);
      radiusVariance += Math.abs(normRadius - 1);
    }
    const avgVariance = radiusVariance / pts.length;

    if (avgVariance < 0.22) {
      // Generate clean smoothed ellipse points
      const smoothCirclePts: Point[] = [];
      const numSteps = 40;
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

    // 3. Check for Clean Rectangle / Box
    if (avgVariance >= 0.22) {
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

  return stroke;
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
