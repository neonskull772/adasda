import { BrushType, CanvasBackground, HandDetectionResult, HandLandmark, Stroke } from '../types';

export function renderBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  background: CanvasBackground
) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  if (background === 'transparent') {
    ctx.restore();
    return;
  }

  if (background === 'dark') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
  } else if (background === 'light') {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
  } else if (background === 'grid') {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else if (background === 'dots') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    const spacing = 30;
    for (let x = spacing / 2; x < width; x += spacing) {
      for (let y = spacing / 2; y < height; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (background === 'neon_grid') {
    ctx.fillStyle = '#050814';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

export function renderStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (!stroke.points || stroke.points.length === 0) return;

  ctx.save();
  ctx.globalAlpha = stroke.opacity;

  if (stroke.brushType === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = stroke.size * 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.globalCompositeOperation = 'source-over';

  if (stroke.brushType === 'solid') {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (stroke.points.length < 3) {
      const b = stroke.points[0];
      ctx.arc(b.x, b.y, stroke.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.color;
      ctx.fill();
    } else {
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
        const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
      }
      ctx.lineTo(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y);
      ctx.stroke();
    }
  } else if (stroke.brushType === 'neon') {
    // Multi-pass neon glow
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer glow
    ctx.shadowColor = stroke.color;
    ctx.shadowBlur = stroke.size * 2;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size * 1.5;

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();

    // Bright core
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, stroke.size * 0.4);
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  } else if (stroke.brushType === 'highlighter') {
    ctx.globalAlpha = stroke.opacity * 0.4;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size * 2.2;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  } else if (stroke.brushType === 'rainbow') {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke.size;

    for (let i = 1; i < stroke.points.length; i++) {
      const p1 = stroke.points[i - 1];
      const p2 = stroke.points[i];
      const hue = (i * 8) % 360;
      ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  } else if (stroke.brushType === 'calligraphy') {
    ctx.fillStyle = stroke.color;
    ctx.strokeStyle = stroke.color;

    for (let i = 1; i < stroke.points.length; i++) {
      const p1 = stroke.points[i - 1];
      const p2 = stroke.points[i];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Speed inverse width
      const width = Math.max(2, stroke.size * (1 / (1 + dist * 0.05)));

      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  } else if (stroke.brushType === 'sparkles') {
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.size * 0.7;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();

    // Sparkle stars along points
    for (let i = 0; i < stroke.points.length; i += 3) {
      const pt = stroke.points[i];
      const radius = (Math.sin(i + Date.now() * 0.005) * 0.5 + 0.5) * stroke.size * 1.2 + 2;
      drawSparkleStar(ctx, pt.x, pt.y, radius, stroke.color);
    }
  }

  ctx.restore();
}

function drawSparkleStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    const innerAngle = angle + Math.PI / 4;
    ctx.lineTo(cx + Math.cos(innerAngle) * (r * 0.3), cy + Math.sin(innerAngle) * (r * 0.3));
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawMultiHandOverlay(
  ctx: CanvasRenderingContext2D,
  detections: HandDetectionResult[],
  width: number,
  height: number,
  showSkeleton: boolean = true,
  isMirrored: boolean = true
) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  if (!detections || detections.length === 0) {
    ctx.restore();
    return;
  }

  for (let dIdx = 0; dIdx < detections.length; dIdx++) {
    const detection = detections[dIdx];
    if (!detection || detection.landmarks.length < 21) continue;

    const landmarks = detection.landmarks;

    const getPixel = (lm: HandLandmark) => ({
      x: isMirrored ? (1 - lm.x) * width : lm.x * width,
      y: lm.y * height,
    });

    const HAND_CONNECTIONS = [
      [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],       // Index
      [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
      [9, 13], [13, 14], [14, 15], [15, 16],// Ring
      [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
      [0, 17],                             // Palm base
    ];

    // Hand-specific primary colors (Indigo for Hand 1, Cyan/Pink for Hand 2)
    const primaryColor = dIdx === 0 ? 'rgba(99, 102, 241, 0.7)' : 'rgba(236, 72, 153, 0.7)';
    const tipColor = dIdx === 0 ? '#6366f1' : '#ec4899';

    if (showSkeleton) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = primaryColor;

      for (const [i, j] of HAND_CONNECTIONS) {
        const p1 = getPixel(landmarks[i]);
        const p2 = getPixel(landmarks[j]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      for (let i = 0; i < landmarks.length; i++) {
        const pt = getPixel(landmarks[i]);
        ctx.fillStyle = i === 8 ? tipColor : i === 4 ? '#f59e0b' : 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, i === 8 || i === 4 ? 6 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Cursor & Pinch Ring Indicator
    const indexPt = detection.indexTip;
    const thumbPt = detection.thumbTip;

    if (indexPt && indexPt.x > 0) {
      if (detection.pinchDistance < 0.2) {
        ctx.strokeStyle = detection.isDrawing ? 'rgba(34, 197, 94, 0.8)' : 'rgba(234, 179, 8, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(indexPt.x, indexPt.y);
        ctx.lineTo(thumbPt.x, thumbPt.y);
        ctx.stroke();
      }

      ctx.save();
      if (detection.isDrawing) {
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#22c55e';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(indexPt.x, indexPt.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(indexPt.x, indexPt.y, 16, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.shadowColor = tipColor;
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(99, 102, 241, 0.3)';
        ctx.strokeStyle = tipColor;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(indexPt.x, indexPt.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const maxDist = 0.2;
        const progress = Math.max(0, Math.min(1, 1 - detection.pinchDistance / maxDist));
        ctx.beginPath();
        ctx.arc(indexPt.x, indexPt.y, 15, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  ctx.restore();
}
