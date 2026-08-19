import { describe, expect, it } from 'vitest';
import { TimelineSession } from './TimelineSession';

describe('TimelineSession', () => {
  it('keeps legacy actions chronological while accepting notes', () => {
    const timeline = new TimelineSession();
    timeline.seedLegacyActions(['第二步', '第一步']);
    timeline.addNote('我的備註');
    expect(timeline.snapshot().map((entry) => entry.text)).toEqual(['第一步', '第二步', '我的備註']);
    expect(timeline.totalLogicalSteps).toBe(3);
  });

  it('removes a latest note before board undo', () => {
    const timeline = new TimelineSession();
    timeline.seedLegacyActions(['第一步']);
    timeline.addNote('備註');
    expect(timeline.removeLatestNoteIfLast()).toBe(true);
    expect(timeline.snapshot().map((entry) => entry.text)).toEqual(['第一步']);
  });

  it('tracks legacy undo without removing notes', () => {
    const timeline = new TimelineSession();
    timeline.seedLegacyActions(['第二步', '第一步']);
    timeline.addNote('保留備註');
    timeline.syncLegacyActions(['第一步']);
    expect(timeline.snapshot().map((entry) => entry.text)).toEqual(['第一步', '保留備註']);
  });
});
