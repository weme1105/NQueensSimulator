import { AUTO_PIPELINE, STEP_PIPELINE } from './pipeline';
import { CellState, type BoardSnapshot, type CellChange, type DeductionResult, type SolverRule } from './types';

type MutableCell = { row: number; col: number; regionId: number; state: CellState };
type Snapshot = {
  queens: MutableCell[];
  rowQueens: Uint8Array;
  colQueens: Uint8Array;
  regionQueens: Uint8Array;
  candidate: Uint8Array;
  rowCandidates: Uint16Array;
  colCandidates: Uint16Array;
  regionCandidates: Uint16Array;
  rowRegionMask: Uint32Array;
  colRegionMask: Uint32Array;
  regionRowMask: Uint32Array;
  regionColMask: Uint32Array;
};

const coord = (row: number, col: number): string => `(${col + 1},${row + 1})`;

export class SolverEngine {
  readonly n: number;
  readonly cells: MutableCell[][];
  private readonly cols: MutableCell[][];
  private readonly regions: MutableCell[][];

  constructor(board: BoardSnapshot) {
    this.n = board.size;
    this.cells = Array.from({ length: this.n }, (_, row) =>
      Array.from({ length: this.n }, (_, col) => ({ row, col, regionId: -1, state: CellState.Empty })),
    );
    for (const cell of board.cells) {
      if (cell.row < 0 || cell.col < 0 || cell.row >= this.n || cell.col >= this.n) continue;
      this.cells[cell.row][cell.col] = { ...cell };
    }
    this.cols = Array.from({ length: this.n }, () => []);
    this.regions = Array.from({ length: this.n }, () => []);
    for (let r = 0; r < this.n; r++) {
      for (let c = 0; c < this.n; c++) {
        const cell = this.cells[r][c];
        this.cols[c].push(cell);
        if (cell.regionId >= 0 && cell.regionId < this.n) this.regions[cell.regionId].push(cell);
      }
    }
  }

  toBoard(): BoardSnapshot {
    return { size: this.n, cells: this.cells.flat().map((c) => ({ ...c })) };
  }

  apply(changes: readonly CellChange[]): CellChange[] {
    const applied: CellChange[] = [];
    for (const change of changes) {
      const cell = this.cells[change.row]?.[change.col];
      if (!cell || cell.state === change.newState) continue;
      cell.state = change.newState;
      applied.push(change);
    }
    return applied;
  }

  countQueens(): number {
    let count = 0;
    for (const row of this.cells) for (const cell of row) if (cell.state === CellState.Queen) count++;
    return count;
  }

  nextStep(): DeductionResult | null {
    const bad = this.contradiction();
    if (bad) throw new Error(`矛盾：${bad}`);
    return this.runPipeline(STEP_PIPELINE);
  }

  nextAutoDeduction(): DeductionResult | null {
    const bad = this.contradiction();
    if (bad) throw new Error(`矛盾：${bad}`);
    return this.runPipeline(AUTO_PIPELINE);
  }

  runRule(rule: SolverRule): DeductionResult | null {
    switch (rule) {
      case 'basic': return this.basic();
      case 'hall-2': return this.hallTier(2);
      case 'hall-3': return this.hallTier(3);
      case 'basic-proof': return this.proof(0, 'basic-proof');
      case 'hall-2-3-proof': return this.proof(3, 'hall-2-3-proof');
      case 'hall-4': return this.hallTier(4);
      case 'hall-5': return this.hallTier(5);
      case 'hall-4-5-proof': return this.proof(5, 'hall-4-5-proof');
    }
  }

  private runPipeline(pipeline: readonly SolverRule[]): DeductionResult | null {
    for (const rule of pipeline) {
      const result = this.runRule(rule);
      if (result) return result;
    }
    return null;
  }

  private unit(kind: 'row' | 'col' | 'region', index: number): MutableCell[] {
    return kind === 'row' ? this.cells[index] : kind === 'col' ? this.cols[index] : this.regions[index];
  }

  private snapshot(): Snapshot {
    const n = this.n;
    const queens: MutableCell[] = [];
    const rowQueens = new Uint8Array(n), colQueens = new Uint8Array(n), regionQueens = new Uint8Array(n);
    for (const row of this.cells) for (const cell of row) if (cell.state === CellState.Queen) {
      queens.push(cell); rowQueens[cell.row]++; colQueens[cell.col]++;
      if (cell.regionId >= 0 && cell.regionId < n) regionQueens[cell.regionId]++;
    }
    const candidate = new Uint8Array(n * n), rowCandidates = new Uint16Array(n), colCandidates = new Uint16Array(n), regionCandidates = new Uint16Array(n);
    const rowRegionMask = new Uint32Array(n), colRegionMask = new Uint32Array(n), regionRowMask = new Uint32Array(n), regionColMask = new Uint32Array(n);
    for (const row of this.cells) for (const cell of row) {
      if (cell.state !== CellState.Empty || cell.regionId < 0 || cell.regionId >= n) continue;
      if (rowQueens[cell.row] || colQueens[cell.col] || regionQueens[cell.regionId]) continue;
      let adjacent = false;
      for (let dr = -1; dr <= 1 && !adjacent; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = cell.row + dr, cc = cell.col + dc;
        if (rr >= 0 && cc >= 0 && rr < n && cc < n && this.cells[rr][cc].state === CellState.Queen) { adjacent = true; break; }
      }
      if (adjacent) continue;
      candidate[cell.row * n + cell.col] = 1;
      rowCandidates[cell.row]++; colCandidates[cell.col]++; regionCandidates[cell.regionId]++;
      rowRegionMask[cell.row] |= 1 << cell.regionId;
      colRegionMask[cell.col] |= 1 << cell.regionId;
      regionRowMask[cell.regionId] |= 1 << cell.row;
      regionColMask[cell.regionId] |= 1 << cell.col;
    }
    return { queens, rowQueens, colQueens, regionQueens, candidate, rowCandidates, colCandidates, regionCandidates, rowRegionMask, colRegionMask, regionRowMask, regionColMask };
  }

  private isCandidate(cell: MutableCell, snap: Snapshot): boolean {
    return cell.state === CellState.Empty && !!snap.candidate[cell.row * this.n + cell.col];
  }

  private contradiction(): string | null {
    const snap = this.snapshot();
    for (let i = 0; i < this.n; i++) {
      if (snap.rowQueens[i] > 1) return `Row ${i + 1} 有多個皇后`;
      if (snap.colQueens[i] > 1) return `Column ${i + 1} 有多個皇后`;
      if (snap.regionQueens[i] > 1) return `Region ${i + 1} 有多個皇后`;
      if (!snap.rowQueens[i] && !snap.rowCandidates[i]) return `Row ${i + 1} 沒有候選格`;
      if (!snap.colQueens[i] && !snap.colCandidates[i]) return `Column ${i + 1} 沒有候選格`;
      if (!snap.regionQueens[i] && !snap.regionCandidates[i]) return `Region ${i + 1} 沒有候選格`;
    }
    return null;
  }

  private basic(): DeductionResult | null {
    if (this.contradiction()) return null;
    const snap = this.snapshot();
    for (const q of snap.queens) {
      const seen = new Uint8Array(this.n * this.n), affected: MutableCell[] = [];
      const add = (cell: MutableCell) => {
        const key = cell.row * this.n + cell.col;
        if (cell !== q && cell.state === CellState.Empty && !seen[key]) { seen[key] = 1; affected.push(cell); }
      };
      for (const c of this.cells[q.row]) add(c);
      for (const c of this.cols[q.col]) add(c);
      for (const c of this.regions[q.regionId] ?? []) add(c);
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const r = q.row + dr, c = q.col + dc;
        if (r >= 0 && c >= 0 && r < this.n && c < this.n) add(this.cells[r][c]);
      }
      if (affected.length) return this.result('basic', `皇后 ${coord(q.row, q.col)} 排除 ${affected.length} 格`, affected, CellState.Excluded);
    }

    for (const kind of ['row', 'col', 'region'] as const) for (let i = 0; i < this.n; i++) {
      if ((kind === 'row' ? snap.rowQueens[i] : kind === 'col' ? snap.colQueens[i] : snap.regionQueens[i])) continue;
      const cand = this.unit(kind, i).filter((c) => this.isCandidate(c, snap));
      if (cand.length === 1) {
        const c = cand[0];
        return { rule: 'basic', label: `${kind} ${i + 1} 只剩唯一候選 ${coord(c.row, c.col)}`, changes: [{ row: c.row, col: c.col, newState: CellState.Queen }], producesQueen: true };
      }
    }

    const cross = this.intersectionQueen(snap); if (cross) return cross;
    const lock = this.lockedCandidates(snap); if (lock) return lock;
    return null;
  }

  private intersectionQueen(snap: Snapshot): DeductionResult | null {
    for (let region = 0; region < this.n; region++) {
      if (snap.regionQueens[region]) continue;
      const rowMask = snap.regionRowMask[region], colMask = snap.regionColMask[region];
      if (!rowMask || !colMask) continue;
      for (let r = 0; r < this.n; r++) {
        if (snap.rowQueens[r] || snap.rowRegionMask[r] !== (1 << region)) continue;
        for (let c = 0; c < this.n; c++) {
          if (snap.colQueens[c] || snap.colRegionMask[c] !== (1 << region)) continue;
          const cell = this.cells[r][c];
          if (cell.regionId === region && this.isCandidate(cell, snap)) {
            return { rule: 'basic', label: `Row ${r + 1} 與 Column ${c + 1} 都被 Region ${region + 1} 包覆，交叉點 ${coord(r, c)} 必為皇后`, changes: [{ row: r, col: c, newState: CellState.Queen }], producesQueen: true };
          }
        }
      }
    }
    return null;
  }

  private lockedCandidates(snap: Snapshot): DeductionResult | null {
    for (let region = 0; region < this.n; region++) {
      if (snap.regionQueens[region]) continue;
      const rm = snap.regionRowMask[region], cm = snap.regionColMask[region];
      if (rm && (rm & (rm - 1)) === 0) {
        const row = trailingBit(rm), affected = this.cells[row].filter((c) => c.regionId !== region && this.isCandidate(c, snap));
        if (affected.length) return this.result('basic', `Region ${region + 1} 候選全部位於 Row ${row + 1}`, affected, CellState.Excluded);
      }
      if (cm && (cm & (cm - 1)) === 0) {
        const col = trailingBit(cm), affected = this.cols[col].filter((c) => c.regionId !== region && this.isCandidate(c, snap));
        if (affected.length) return this.result('basic', `Region ${region + 1} 候選全部位於 Column ${col + 1}`, affected, CellState.Excluded);
      }
    }
    for (const kind of ['row', 'col'] as const) for (let i = 0; i < this.n; i++) {
      const q = kind === 'row' ? snap.rowQueens[i] : snap.colQueens[i]; if (q) continue;
      const mask = kind === 'row' ? snap.rowRegionMask[i] : snap.colRegionMask[i];
      if (!mask || (mask & (mask - 1))) continue;
      const region = trailingBit(mask);
      const affected = this.regions[region].filter((c) => this.isCandidate(c, snap) && (kind === 'row' ? c.row !== i : c.col !== i));
      if (affected.length) return this.result('basic', `${kind} ${i + 1} 候選全部位於 Region ${region + 1}`, affected, CellState.Excluded);
    }
    return null;
  }

  private hallTier(size: number): DeductionResult | null {
    const rule = `hall-${size}` as SolverRule;
    return this.hall('row', size, rule) || this.hall('col', size, rule) || this.reverseHall('row', size, rule) || this.reverseHall('col', size, rule);
  }

  private hall(kind: 'row' | 'col', size: number, rule: SolverRule): DeductionResult | null {
    const snap = this.snapshot(), active: number[] = [], masks = kind === 'row' ? snap.rowRegionMask : snap.colRegionMask;
    const queens = kind === 'row' ? snap.rowQueens : snap.colQueens;
    for (let i = 0; i < this.n; i++) if (!queens[i] && bitCount(masks[i]) > 0 && bitCount(masks[i]) <= size) active.push(i);
    let found: DeductionResult | null = null;
    combinations(active, size, (units) => {
      let union = 0; for (const i of units) union |= masks[i];
      if (bitCount(union) !== size) return false;
      const unitSet = new Set(units), affected: MutableCell[] = [];
      for (let region = 0; region < this.n; region++) if (union & (1 << region)) {
        for (const c of this.regions[region]) if (this.isCandidate(c, snap) && !unitSet.has(kind === 'row' ? c.row : c.col)) affected.push(c);
      }
      if (!affected.length) return false;
      found = this.result(rule, `${kind === 'row' ? 'Rows' : 'Columns'} ${units.map((i) => i + 1).join(',')} 形成 Hall ${size}`, affected, CellState.Excluded);
      return true;
    });
    return found;
  }

  private reverseHall(kind: 'row' | 'col', size: number, rule: SolverRule): DeductionResult | null {
    const snap = this.snapshot(), active: number[] = [], masks = kind === 'row' ? snap.regionRowMask : snap.regionColMask;
    for (let region = 0; region < this.n; region++) if (!snap.regionQueens[region] && bitCount(masks[region]) > 0 && bitCount(masks[region]) <= size) active.push(region);
    let found: DeductionResult | null = null;
    combinations(active, size, (regions) => {
      let union = 0; for (const r of regions) union |= masks[r];
      if (bitCount(union) !== size) return false;
      const regionSet = new Set(regions), affected: MutableCell[] = [];
      for (let unit = 0; unit < this.n; unit++) if (union & (1 << unit)) {
        for (const c of this.unit(kind, unit)) if (this.isCandidate(c, snap) && !regionSet.has(c.regionId)) affected.push(c);
      }
      if (!affected.length) return false;
      found = this.result(rule, `色塊 ${regions.map((i) => i + 1).join(',')} 形成反向 Hall ${size}`, affected, CellState.Excluded);
      return true;
    });
    return found;
  }

  private proof(maxHall: number, rule: SolverRule, minHall = 2): DeductionResult | null {
    const snap = this.snapshot();
    const candidates = this.cells.flat().filter((c) => this.isCandidate(c, snap));
    candidates.sort((a, b) => (snap.rowCandidates[a.row] + snap.colCandidates[a.col] + snap.regionCandidates[a.regionId]) - (snap.rowCandidates[b.row] + snap.colCandidates[b.col] + snap.regionCandidates[b.regionId]));
    for (const assumed of [CellState.Queen, CellState.Excluded] as const) {
      for (const cell of candidates) {
        const clone = new SolverEngine(this.toBoard());
        clone.cells[cell.row][cell.col].state = assumed;
        const contradiction = clone.closure(maxHall, minHall);
        if (!contradiction) continue;
        const newState = assumed === CellState.Queen ? CellState.Excluded : CellState.Queen;
        return {
          rule,
          label: `反證：假設 ${coord(cell.row, cell.col)} ${assumed === CellState.Queen ? '是皇后' : '是 X'} 會造成「${contradiction}」`,
          changes: [{ row: cell.row, col: cell.col, newState }],
          producesQueen: newState === CellState.Queen,
        };
      }
    }
    return null;
  }

  private closure(maxHall: number, minHall: number): string | null {
    const limit = this.n * this.n * 20;
    for (let guard = 0; guard < limit; guard++) {
      const bad = this.contradiction(); if (bad) return bad;
      let d = this.basic();
      if (!d && maxHall >= 2) for (let size = minHall; size <= maxHall && !d; size++) d = this.hallTier(size);
      if (!d) return null;
      this.apply(d.changes);
    }
    return null;
  }

  countSolutions(limit = 2): number {
    const n = this.n, assigned = new Uint8Array(n), placedCols = new Int16Array(n); placedCols.fill(-1);
    let usedCols = 0, usedRegions = 0, count = 0;
    const valid = (cell: MutableCell) => {
      if (cell.regionId < 0 || cell.regionId >= n || assigned[cell.row]) return false;
      if ((usedCols & (1 << cell.col)) || (usedRegions & (1 << cell.regionId))) return false;
      if (cell.row > 0 && placedCols[cell.row - 1] >= 0 && Math.abs(placedCols[cell.row - 1] - cell.col) <= 1) return false;
      if (cell.row + 1 < n && placedCols[cell.row + 1] >= 0 && Math.abs(placedCols[cell.row + 1] - cell.col) <= 1) return false;
      return true;
    };
    const choose = (): MutableCell[] | null => {
      let best: MutableCell[] | null = null;
      for (let r = 0; r < n; r++) if (!assigned[r]) {
        const cand = this.cells[r].filter(valid); if (!cand.length) return [];
        if (!best || cand.length < best.length) best = cand;
      }
      for (let c = 0; c < n; c++) if (!(usedCols & (1 << c))) {
        const cand = this.cols[c].filter(valid); if (!cand.length) return [];
        if (!best || cand.length < best.length) best = cand;
      }
      for (let region = 0; region < n; region++) if (!(usedRegions & (1 << region))) {
        const cand = this.regions[region].filter(valid); if (!cand.length) return [];
        if (!best || cand.length < best.length) best = cand;
      }
      return best;
    };
    const dfs = (depth: number) => {
      if (count >= limit) return;
      if (depth === n) { count++; return; }
      const candidates = choose(); if (!candidates?.length) return;
      for (const cell of candidates) {
        assigned[cell.row] = 1; placedCols[cell.row] = cell.col; usedCols |= 1 << cell.col; usedRegions |= 1 << cell.regionId;
        dfs(depth + 1);
        usedRegions &= ~(1 << cell.regionId); usedCols &= ~(1 << cell.col); placedCols[cell.row] = -1; assigned[cell.row] = 0;
        if (count >= limit) return;
      }
    };
    dfs(0); return count;
  }

  private result(rule: SolverRule, label: string, cells: MutableCell[], state: CellState): DeductionResult {
    return { rule, label, changes: cells.map((c) => ({ row: c.row, col: c.col, newState: state })), producesQueen: state === CellState.Queen };
  }
}

function bitCount(value: number): number { let n = 0; while (value) { value &= value - 1; n++; } return n; }
function trailingBit(mask: number): number { return 31 - Math.clz32(mask & -mask); }
function combinations(items: readonly number[], size: number, visit: (pick: readonly number[]) => boolean): boolean {
  const pick: number[] = [];
  const walk = (start: number, left: number): boolean => {
    if (!left) return visit(pick);
    for (let i = start; i <= items.length - left; i++) { pick.push(items[i]); if (walk(i + 1, left - 1)) return true; pick.pop(); }
    return false;
  };
  return walk(0, size);
}