import type { CellChange } from './solver/types';

export function installDeductionHighlight(): {
  show(changes: readonly CellChange[]): void;
  clear(): void;
} {
  const board = document.querySelector<HTMLElement>('#board');
  const style = document.createElement('style');
  style.textContent = `
    @keyframes nq-deduction-flash {
      0%, 100% { box-shadow: inset 0 0 0 0 rgba(255,255,255,0), 0 0 0 0 rgba(86,64,64,0); filter: brightness(1); }
      50% { box-shadow: inset 0 0 0 4px rgba(255,255,255,.92), 0 0 0 5px rgba(86,64,64,.55); filter: brightness(1.22); }
    }
    .cell.nq-deduction-flash {
      z-index: 12;
      animation: nq-deduction-flash .72s ease-in-out infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .cell.nq-deduction-flash {
        animation: none;
        box-shadow: inset 0 0 0 4px rgba(255,255,255,.92), 0 0 0 5px rgba(86,64,64,.55);
      }
    }
  `;
  document.head.appendChild(style);

  const clear = (): void => {
    board?.querySelectorAll('.nq-deduction-flash').forEach((element) => element.classList.remove('nq-deduction-flash'));
  };

  const show = (changes: readonly CellChange[]): void => {
    clear();
    if (!board || !changes.length) return;
    requestAnimationFrame(() => {
      for (const change of changes) {
        board.querySelector<HTMLElement>(`.cell[data-row="${change.row}"][data-col="${change.col}"]`)?.classList.add('nq-deduction-flash');
      }
    });
  };

  // Any subsequent user interaction ends the previous deduction highlight.
  document.addEventListener('pointerdown', clear, true);
  document.addEventListener('keydown', clear, true);

  return { show, clear };
}
