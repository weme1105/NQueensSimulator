import { describe, expect, it } from 'vitest';
import { UiSession } from './UiSession';

describe('UiSession', () => {
  it('closes transient panels when leaving play mode', () => {
    const ui = new UiSession();
    ui.setPlayMode(true);
    ui.toggleRuleGuide();
    ui.toggleOperationTips();
    ui.setPlayMode(false);
    expect(ui.snapshot()).toMatchObject({ playMode: false, ruleGuideOpen: false, operationTipsOpen: false });
  });

  it('tracks solver unlock independently from play mode', () => {
    const ui = new UiSession();
    ui.setSolverUnlocked(true);
    expect(ui.snapshot().solverUnlocked).toBe(true);
  });
});
