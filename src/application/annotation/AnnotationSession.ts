export interface AnnotationPoint {
  x: number;
  y: number;
}

export interface AnnotationStroke {
  points: AnnotationPoint[];
  color: string;
  opacity: number;
  width: number;
  erase: boolean;
}

export interface AnnotationBrush {
  color: string;
  opacity: number;
  width: number;
}

export interface AnnotationState {
  enabled: boolean;
  erase: boolean;
  drawing: boolean;
  brush: AnnotationBrush;
}

/** Pure drawing interaction state. Canvas rendering and pointer capture are adapters. */
export class AnnotationSession {
  private enabled = false;
  private erase = false;
  private drawing = false;
  private brush: AnnotationBrush = { color: '#ff2d55', opacity: 0.75, width: 6 };
  private readonly strokes: AnnotationStroke[] = [];
  private active: AnnotationStroke | null = null;

  snapshot(): Readonly<AnnotationState> {
    return { enabled: this.enabled, erase: this.erase, drawing: this.drawing, brush: { ...this.brush } };
  }

  getStrokes(): readonly AnnotationStroke[] {
    return this.strokes.map(cloneStroke);
  }

  getActiveStroke(): AnnotationStroke | null {
    return this.active ? cloneStroke(this.active) : null;
  }

  togglePen(): void {
    this.enabled = !this.enabled;
    this.erase = false;
    if (!this.enabled) this.cancelStroke();
  }

  toggleEraser(): void {
    this.enabled = true;
    this.erase = !this.erase;
  }

  disable(): void {
    this.enabled = false;
    this.erase = false;
    this.cancelStroke();
  }

  setBrush(partial: Partial<AnnotationBrush>): void {
    this.brush = {
      color: partial.color ?? this.brush.color,
      opacity: clamp(partial.opacity ?? this.brush.opacity, 0.1, 1),
      width: Math.max(1, partial.width ?? this.brush.width),
    };
  }

  beginStroke(point: AnnotationPoint): void {
    if (!this.enabled) return;
    this.drawing = true;
    this.active = {
      points: [clampPoint(point)],
      color: this.brush.color,
      opacity: this.brush.opacity,
      width: this.brush.width,
      erase: this.erase,
    };
  }

  extendStroke(point: AnnotationPoint): void {
    if (!this.drawing || !this.active) return;
    this.active.points.push(clampPoint(point));
  }

  finishStroke(): void {
    if (!this.drawing) return;
    this.drawing = false;
    if (this.active && this.active.points.length > 1) this.strokes.push(cloneStroke(this.active));
    this.active = null;
  }

  cancelStroke(): void {
    this.drawing = false;
    this.active = null;
  }

  undo(): void {
    this.strokes.pop();
  }

  clear(): void {
    this.strokes.length = 0;
    this.cancelStroke();
  }

  reset(): void {
    this.clear();
    this.enabled = false;
    this.erase = false;
    this.brush = { color: '#ff2d55', opacity: 0.75, width: 6 };
  }
}

function cloneStroke(stroke: AnnotationStroke): AnnotationStroke {
  return { ...stroke, points: stroke.points.map((point) => ({ ...point })) };
}

function clampPoint(point: AnnotationPoint): AnnotationPoint {
  return { x: clamp(point.x, 0, 1), y: clamp(point.y, 0, 1) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
