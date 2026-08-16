type RegionColorBridge = {
  getBoard(): {
    size: number;
    cells: Array<{ row: number; col: number; regionId: number; state: number }>;
  };
  getSize(): number;
};

const DEFAULT_COLORS = [
  '#9cc7e8', '#b97a56', '#38a8bb', '#ce6585', '#d6a900',
  '#7d68cf', '#2f8f55', '#85cf72', '#ffd97d', '#e983d3',
  '#64c96d', '#7bb2d8', '#ef8a62', '#9b8ad6', '#5bb7a7',
  '#d77c94', '#6f9fd8', '#a7c957', '#f2a65a', '#8d99ae',
];

const STORAGE_KEY = 'nq-region-colors-v1';

function loadColors(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (Array.isArray(parsed)) {
      return DEFAULT_COLORS.map((fallback, index) => {
        const value = parsed[index];
        return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
      });
    }
  } catch {
    // Ignore malformed local data and fall back to the built-in palette.
  }
  return DEFAULT_COLORS.slice();
}

function saveColors(colors: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
}

export function installRegionColors(app: RegionColorBridge): void {
  const palette = document.querySelector<HTMLElement>('#palette');
  const board = document.querySelector<HTMLElement>('#board');
  const modeBox = document.querySelector<HTMLElement>('#mode');
  if (!palette || !board || !modeBox) return;

  let colors = loadColors();
  let panel: HTMLElement | null = null;
  let scheduled = false;

  const style = document.createElement('style');
  style.textContent = `
    .region-color-tools{margin:0 0 10px;display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap}
    .region-color-toggle{padding:7px 10px;font-size:13px}
    .region-color-panel{display:none;width:100%;padding:10px;border:1px solid #eaded8;border-radius:12px;background:#fff9f6}
    .region-color-panel.open{display:block}
    .region-color-grid{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:9px}
    .region-color-item{width:46px;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px;font-weight:700;color:#6b5555}
    .region-color-picker{width:42px;height:34px;padding:2px;border:1px solid #d9cbc5;border-radius:8px;background:#fff;cursor:pointer}
    .region-color-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .region-color-reset{padding:6px 9px;font-size:12px}
    .region-color-hint{font-size:12px;color:#806f6f}
    .cell.nq-marked::after{content:"";position:absolute;inset:0;border-radius:inherit;background:rgba(255,255,255,.55);pointer-events:none;z-index:0}
    .cell.nq-marked .mark{z-index:1}
  `;
  document.head.appendChild(style);

  const tools = document.createElement('div');
  tools.className = 'region-color-tools';
  tools.innerHTML = '<button type="button" class="region-color-toggle">🎨 自訂色塊顏色</button>';
  modeBox.insertAdjacentElement('afterend', tools);

  const toggle = tools.querySelector<HTMLButtonElement>('.region-color-toggle');

  function ensureColorCapacity(size: number): void {
    while (colors.length < size) {
      colors.push(DEFAULT_COLORS[colors.length % DEFAULT_COLORS.length]);
    }
  }

  function buildPanel(): void {
    if (panel) panel.remove();
    panel = document.createElement('div');
    panel.className = 'region-color-panel open';
    const size = app.getSize();
    ensureColorCapacity(size);

    const grid = document.createElement('div');
    grid.className = 'region-color-grid';
    for (let i = 0; i < size; i++) {
      const item = document.createElement('label');
      item.className = 'region-color-item';
      item.innerHTML = `<span>${i + 1}</span>`;

      const picker = document.createElement('input');
      picker.type = 'color';
      picker.className = 'region-color-picker';
      picker.value = colors[i];
      picker.title = `色塊 ${i + 1} 顏色`;
      picker.addEventListener('input', () => {
        colors[i] = picker.value;
        saveColors(colors);
        applyColors();
      });
      item.appendChild(picker);
      grid.appendChild(item);
    }

    const actions = document.createElement('div');
    actions.className = 'region-color-actions';
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'region-color-reset';
    reset.textContent = '恢復預設色';
    reset.addEventListener('click', () => {
      colors = DEFAULT_COLORS.slice();
      ensureColorCapacity(app.getSize());
      saveColors(colors);
      buildPanel();
      applyColors();
    });
    const hint = document.createElement('span');
    hint.className = 'region-color-hint';
    hint.textContent = '只改顯示顏色，不會改變色塊編號或推演結果。';
    actions.append(reset, hint);

    panel.append(grid, actions);
    tools.appendChild(panel);
  }

  toggle?.addEventListener('click', () => {
    if (!panel) {
      buildPanel();
      return;
    }
    panel.classList.toggle('open');
  });

  function applyColors(): void {
    const snapshot = app.getBoard();
    ensureColorCapacity(snapshot.size);

    const paletteButtons = Array.from(palette.querySelectorAll<HTMLElement>('.colorBtn'));
    for (let i = 0; i < Math.min(snapshot.size, paletteButtons.length); i++) {
      paletteButtons[i].style.background = colors[i];
    }

    const boardCells = Array.from(board.querySelectorAll<HTMLElement>('.cell'));
    for (let i = 0; i < Math.min(snapshot.cells.length, boardCells.length); i++) {
      const cell = snapshot.cells[i];
      const element = boardCells[i];
      if (cell.regionId >= 0) {
        element.style.background = colors[cell.regionId] ?? DEFAULT_COLORS[cell.regionId % DEFAULT_COLORS.length];
      }
      element.classList.toggle('nq-marked', cell.state === 1 || cell.state === 2);
    }
  }

  function scheduleApply(): void {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyColors();
    });
  }

  const observer = new MutationObserver(scheduleApply);
  observer.observe(palette, { childList: true });
  observer.observe(board, { childList: true });

  // Legacy UI updates individual cell inline styles while dragging, without rebuilding the board.
  for (const eventName of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
    board.addEventListener(eventName, scheduleApply);
  }

  // N may change after a new board is built; rebuild the editor the next time it is opened.
  document.querySelector('#new')?.addEventListener('click', () => {
    if (panel) {
      panel.remove();
      panel = null;
    }
    scheduleApply();
  });
  document.querySelector('#random')?.addEventListener('click', scheduleApply);
  document.querySelector('#edit')?.addEventListener('click', scheduleApply);
  document.querySelector('#play')?.addEventListener('click', scheduleApply);
  document.querySelector('#undo')?.addEventListener('click', scheduleApply);
  document.querySelector('#clear')?.addEventListener('click', scheduleApply);
  document.querySelector('#stepSolve')?.addEventListener('click', scheduleApply);
  document.querySelector('#autoQueen')?.addEventListener('click', scheduleApply);

  applyColors();
}
