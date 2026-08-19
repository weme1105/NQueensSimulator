import type { CellChange } from '../board/types';

export type SolverRule =
  | 'basic'
  | 'hall-2'
  | 'hall-3'
  | 'basic-proof'
  | 'hall-2-3-proof'
  | 'hall-4'
  | 'hall-5'
  | 'hall-4-5-proof';

export interface DeductionResult {
  rule: SolverRule;
  label: string;
  changes: CellChange[];
  producesQueen: boolean;
}
