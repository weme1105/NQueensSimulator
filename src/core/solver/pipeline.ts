import type { SolverRule } from './types';

/** Full single-step order: cheapest deterministic rule first. */
export const STEP_PIPELINE: readonly SolverRule[] = [
  'basic',
  'hall-2',
  'hall-3',
  'basic-proof',
  'hall-2-3-proof',
  'hall-4',
  'hall-5',
  'hall-4-5-proof',
];

/** Auto mode deliberately stops before expensive Hall 4/5 proof tiers. */
export const AUTO_PIPELINE: readonly SolverRule[] = [
  'basic',
  'hall-2',
  'hall-3',
  'basic-proof',
  'hall-2-3-proof',
];
