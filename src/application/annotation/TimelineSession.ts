export type TimelineEntryType = 'action' | 'note';

export interface TimelineEntry {
  id: number;
  type: TimelineEntryType;
  text: string;
}

/**
 * Platform-independent chronological operation timeline.
 * Legacy/web adapters may feed action snapshots into this class while notes are
 * appended directly by the application.
 */
export class TimelineSession {
  private entries: TimelineEntry[] = [];
  private sequence = 0;
  private lastActionCount = 0;

  snapshot(): readonly TimelineEntry[] {
    return this.entries.map((entry) => ({ ...entry }));
  }

  get actionCount(): number {
    return this.lastActionCount;
  }

  get noteCount(): number {
    return this.entries.reduce((count, entry) => count + (entry.type === 'note' ? 1 : 0), 0);
  }

  get totalLogicalSteps(): number {
    return this.lastActionCount + this.noteCount;
  }

  addNote(text: string): TimelineEntry | null {
    const normalized = text.trim();
    if (!normalized) return null;
    const entry = { id: ++this.sequence, type: 'note' as const, text: normalized };
    this.entries.push(entry);
    return { ...entry };
  }

  removeLatestNoteIfLast(): boolean {
    if (this.entries.at(-1)?.type !== 'note') return false;
    this.entries.pop();
    return true;
  }

  /**
   * Synchronize with a legacy newest-first action list. Existing note entries stay
   * interleaved; newly detected actions are appended chronologically.
   */
  syncLegacyActions(newestFirstTexts: readonly string[]): void {
    const count = newestFirstTexts.length;
    if (count > this.lastActionCount) {
      const added = newestFirstTexts.slice(0, count - this.lastActionCount).reverse();
      for (const text of added) {
        this.entries.push({ id: ++this.sequence, type: 'action', text: text.trim() });
      }
    } else if (count < this.lastActionCount) {
      this.removeLatestActions(this.lastActionCount - count);
    }
    this.lastActionCount = count;
  }

  seedLegacyActions(newestFirstTexts: readonly string[]): void {
    this.reset();
    for (const text of newestFirstTexts.slice().reverse()) {
      this.entries.push({ id: ++this.sequence, type: 'action', text: text.trim() });
    }
    this.lastActionCount = newestFirstTexts.length;
  }

  reset(): void {
    this.entries = [];
    this.sequence = 0;
    this.lastActionCount = 0;
  }

  private removeLatestActions(count: number): void {
    for (let removed = 0; removed < count;) {
      const index = this.entries.map((entry) => entry.type).lastIndexOf('action');
      if (index < 0) break;
      this.entries.splice(index, 1);
      removed++;
    }
  }
}
