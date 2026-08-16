import type { BoardSnapshot } from './solver/types';

type LabelBridge = {
  getBoard(): BoardSnapshot;
  isPlayMode(): boolean;
};

export function installCellLabels(app: LabelBridge): void {
  const board = document.querySelector<HTMLElement>('#board');
  if (!board) return;

  const style = document.createElement('style');
  style.textContent = `
    .cell .region-number,
    .cell .cell-coordinate {
      position: absolute;
      left: 0;
      right: 0;
      pointer-events: none;
      z-index: 2;
      color: rgba(255,255,255,.94);
      text-shadow: 0 1px 3px rgba(0,0,0,.62);
      font-weight: 700;
      line-height: 1;
    }
    .cell .region-number {
      top: 50%;
      transform: translateY(-55%);
      text-align: center;
      font-size: clamp(11px, 1.45vw, 19px);
    }
    .cell .cell-coordinate {
      bottom: 5px;
      text-align: center;
      font-size: clamp(7px, .82vw, 11px);
      font-weight: 600;
      opacity: .9;
    }
    .cell.region-edge-top { border-top: 4px solid #c9c1bd !important; }
    .cell.region-edge-right { border-right: 4px solid #c9c1bd !important; }
    .cell.region-edge-bottom { border-bottom: 4px solid #c9c1bd !important; }
    .cell.region-edge-left { border-left: 4px solid #c9c1bd !important; }
    @media (max-width: 850px) {
      .cell .region-number { font-size: clamp(9px, 3.4vw, 17px); }
      .cell .cell-coordinate { bottom: 3px; font-size: clamp(6px, 2.15vw, 10px); }
      .cell.region-edge-top { border-top-width: 3px !important; }
      .cell.region-edge-right { border-right-width: 3px !important; }
      .cell.region-edge-bottom { border-bottom-width: 3px !important; }
      .cell.region-edge-left { border-left-width: 3px !important; }
    }
  `;
  document.head.appendChild(style);

  let scheduled = false;
  const refresh = (): void => {
    scheduled = false;
    const snapshot = app.getBoard();
    const byKey = new Map(snapshot.cells.map((cell) => [`${cell.row},${cell.col}`, cell]));

    for (const element of board.querySelectorAll<HTMLElement>('.cell')) {
      const row = Number(element.dataset.row);
      const col = Number(element.dataset.col);
      const cell = byKey.get(`${row},${col}`);
      if (!cell) continue;

      element.querySelector('.region-number')?.remove();
      element.querySelector('.cell-coordinate')?.remove();
      element.classList.remove('region-edge-top', 'region-edge-right', 'region-edge-bottom', 'region-edge-left');

      if (cell.regionId >= 0) {
        const different = (r: number, c: number): boolean => {
          const neighbor = byKey.get(`${r},${c}`);
          return !neighbor || neighbor.regionId !== cell.regionId;
        };
        if (different(row - 1, col)) element.classList.add('region-edge-top');
        if (different(row, col + 1)) element.classList.add('region-edge-right');
        if (different(row + 1, col)) element.classList.add('region-edge-bottom');
        if (different(row, col - 1)) element.classList.add('region-edge-left');
      }

      if (!app.isPlayMode() || cell.state !== 0 || cell.regionId < 0) continue;

      const region = document.createElement('span');
      region.className = 'region-number';
      region.textContent = String(cell.regionId + 1);

      const coordinate = document.createElement('span');
      coordinate.className = 'cell-coordinate';
      coordinate.textContent = `(${col + 1},${row + 1})`;

      element.append(region, coordinate);
    }
  };

  const schedule = (): void => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refresh);
  };

  new MutationObserver(schedule).observe(board, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'style'],
  });

  document.querySelector('#play')?.addEventListener('click', () => requestAnimationFrame(schedule));
  document.querySelector('#edit')?.addEventListener('click', () => requestAnimationFrame(schedule));
  schedule();
}
