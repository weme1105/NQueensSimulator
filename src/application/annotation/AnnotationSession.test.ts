import { describe, expect, it } from 'vitest';
import { AnnotationSession } from './AnnotationSession';

describe('AnnotationSession', () => {
  it('records a completed pen stroke', () => {
    const session = new AnnotationSession();
    session.togglePen();
    session.beginStroke({ x: 0.1, y: 0.2 });
    session.extendStroke({ x: 0.4, y: 0.5 });
    session.finishStroke();
    expect(session.getStrokes()).toHaveLength(1);
    expect(session.getStrokes()[0].erase).toBe(false);
  });

  it('supports eraser strokes and undo', () => {
    const session = new AnnotationSession();
    session.toggleEraser();
    session.beginStroke({ x: 0, y: 0 });
    session.extendStroke({ x: 1, y: 1 });
    session.finishStroke();
    expect(session.getStrokes()[0].erase).toBe(true);
    session.undo();
    expect(session.getStrokes()).toHaveLength(0);
  });

  it('disabling cancels an active stroke', () => {
    const session = new AnnotationSession();
    session.togglePen();
    session.beginStroke({ x: 0.2, y: 0.2 });
    session.disable();
    expect(session.snapshot().drawing).toBe(false);
    expect(session.getActiveStroke()).toBeNull();
  });
});
