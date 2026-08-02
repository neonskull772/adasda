import { Point, Stroke } from '../types';

function dist(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const l2 = Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2);
  if (l2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * (b.x - a.x);
  const projY = a.y + t * (b.y - a.y);
  return dist(p, { x: projX, y: projY });
}

function rdpSimplify(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;

  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = pointToSegmentDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const recResults1 = rdpSimplify(points.slice(0, index + 1), epsilon);
    const recResults2 = rdpSimplify(points.slice(index), epsilon);
    return [...recResults1.slice(0, recResults1.length - 1), ...recResults2];
  } else {
    return [points[0], points[end]];
  }
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

export function recognizeAndSmoothShape(stroke: Stroke): Stroke {
  if (!stroke.points || stroke.points.length < 5) return stroke;

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

  // Small strokes or single taps - keep as is
  if (diag < 15) return stroke;

  const startEndDist = dist(start, end);

  // -------------------------------------------------------------------------
  // 1. STRAIGHT LINE RECOGNITION
  // -------------------------------------------------------------------------
  if (startEndDist > diag * 0.75) {
    let maxLineDev = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const dev = pointToSegmentDistance(pts[i], start, end);
      maxLineDev = Math.max(maxLineDev, dev);
    }

    if (maxLineDev < Math.max(12, diag * 0.08)) {
      // Generate 12 evenly spaced points along the straight line
      const linePts: Point[] = [];
      const steps = 12;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        linePts.push({
          x: start.x + t * (end.x - start.x),
          y: start.y + t * (end.y - start.y),
        });
      }
      return { ...stroke, points: linePts };
    }
  }

  // -------------------------------------------------------------------------
  // 2. CLOSED SHAPE RECOGNITION (Triangles, Rectangles/Squares, Circles)
  // -------------------------------------------------------------------------
  const isClosed = startEndDist < Math.max(40, diag * 0.35);

  if (isClosed && pts.length >= 8) {
    // Duplicate start point at the end to form a closed loop for RDP corner analysis
    const closedPts = [...pts, start];

    // RDP simplification to extract key corners
    const epsilon = Math.max(8, diag * 0.07);
    const simplified = rdpSimplify(closedPts, epsilon);

    // Filter out consecutive duplicate/very close points
    const uniqueCorners: Point[] = [];
    for (let i = 0; i < simplified.length - 1; i++) {
      const p = simplified[i];
      if (uniqueCorners.length === 0 || dist(p, uniqueCorners[uniqueCorners.length - 1]) > 12) {
        uniqueCorners.push(p);
      }
    }

    const cornerCount = uniqueCorners.length;

    // A. TRIANGLE (3 distinct corners)
    if (cornerCount === 3) {
      const [v1, v2, v3] = uniqueCorners;
      return {
        ...stroke,
        points: [v1, v2, v3, v1],
      };
    }

    // B. RECTANGLE OR SQUARE (4 distinct corners)
    if (cornerCount === 4) {
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const aspect = Math.abs(width - height) / Math.max(width, height);

      if (aspect < 0.18) {
        // Snap to perfect Square
        const side = (width + height) / 2;
        const half = side / 2;
        const squarePts: Point[] = [
          { x: cx - half, y: cy - half },
          { x: cx + half, y: cy - half },
          { x: cx + half, y: cy + half },
          { x: cx - half, y: cy + half },
          { x: cx - half, y: cy - half },
        ];
        return { ...stroke, points: squarePts };
      } else {
        // Clean Rectangle from corners
        const rectPts: Point[] = [
          uniqueCorners[0],
          uniqueCorners[1],
          uniqueCorners[2],
          uniqueCorners[3],
          uniqueCorners[0],
        ];
        return { ...stroke, points: rectPts };
      }
    }

    // C. CIRCLE / ELLIPSE (Smooth curvature, low radial error, no sharp corners)
    if (cornerCount > 4 || cornerCount < 3) {
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const rx = width / 2;
      const ry = height / 2;

      let totalRadiusErr = 0;
      for (const p of pts) {
        const nx = (p.x - cx) / (rx || 1);
        const ny = (p.y - cy) / (ry || 1);
        const distNorm = Math.sqrt(nx * nx + ny * ny);
        totalRadiusErr += Math.abs(distNorm - 1);
      }
      const avgCircleErr = totalRadiusErr / pts.length;

      // Strict check for circle/ellipse (< 0.075 radial error)
      if (avgCircleErr < 0.075) {
        const smoothCirclePts: Point[] = [];
        const numSteps = 36;
        for (let i = 0; i <= numSteps; i++) {
          const angle = (i / numSteps) * Math.PI * 2;
          smoothCirclePts.push({
            x: cx + Math.cos(angle) * rx,
            y: cy + Math.sin(angle) * ry,
          });
        }
        return { ...stroke, points: smoothCirclePts };
      }
    }
  }

  // -------------------------------------------------------------------------
  // 3. FALLBACK: FREEHAND DRAWINGS & DOODLES
  // -------------------------------------------------------------------------
  return {
    ...stroke,
    points: smoothPathPoints(pts),
  };
}
