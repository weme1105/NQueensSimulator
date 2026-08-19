export interface UiState {
  playMode: boolean;
  solverUnlocked: boolean;
  ruleGuideOpen: boolean;
  operationTipsOpen: boolean;
}

/** Platform-independent ephemeral UI state; DOM/native views only render it. */
export class UiSession {
  private state: UiState = {
    playMode: false,
    solverUnlocked: false,
    ruleGuideOpen: false,
    operationTipsOpen: false,
  };

  snapshot(): Readonly<UiState> {
    return { ...this.state };
  }

  setPlayMode(playMode: boolean): void {
    this.state.playMode = playMode;
    if (!playMode) {
      this.state.ruleGuideOpen = false;
      this.state.operationTipsOpen = false;
    }
  }

  setSolverUnlocked(solverUnlocked: boolean): void {
    this.state.solverUnlocked = solverUnlocked;
  }

  toggleRuleGuide(): void {
    if (!this.state.playMode) return;
    this.state.ruleGuideOpen = !this.state.ruleGuideOpen;
  }

  toggleOperationTips(): void {
    if (!this.state.playMode) return;
    this.state.operationTipsOpen = !this.state.operationTipsOpen;
  }

  closeTransientPanels(): void {
    this.state.ruleGuideOpen = false;
    this.state.operationTipsOpen = false;
  }
}
