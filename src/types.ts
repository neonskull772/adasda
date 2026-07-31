export type BrushType = 'solid' | 'neon' | 'rainbow' | 'sparkles' | 'calligraphy' | 'highlighter' | 'eraser';

export type GestureMode = 'pinch' | 'pointing' | 'peace_hover';

export type CanvasBackground = 'transparent' | 'dark' | 'light' | 'grid' | 'dots' | 'neon_grid';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  size: number;
  opacity: number;
  brushType: BrushType;
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export type GestureType = 'none' | 'pinch' | 'pointing' | 'open_palm' | 'fist' | 'peace';

export interface HandDetectionResult {
  landmarks: HandLandmark[];
  gesture: GestureType;
  pinchDistance: number;
  indexTip: Point;
  thumbTip: Point;
  wrist: Point;
  isDrawing: boolean;
  handSide: 'Left' | 'Right' | 'Unknown';
}

export interface AirButton {
  id: string;
  label: string;
  iconName: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number;
  height: number;
  action: () => void;
  color?: string;
}

export interface Artwork {
  id: string;
  title: string;
  createdAt: number;
  dataUrl: string;
  strokesCount: number;
  thumbnailUrl: string;
}
