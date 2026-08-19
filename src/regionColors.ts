import { DEFAULT_REGION_COLORS, RegionColorSettings } from './application/settings/RegionColorSettings';
import { LocalStorageRegionColorRepository } from './platform/web/settings/LocalStorageRegionColorRepository';

type RegionColorBridge = {
  getBoard(): {
    size: number;
    cells: Array<{ row: number; col: number; regionId: number; state: number }>;
  };
  getSize(): number;
};

export function installRegionColors(app: RegionColorBridge): void {
  const palette = document.querySelector<HTMLElement>('#palette');
  const board = document.querySelector<HTMLElement>('#board');
  const modeBox = document.querySelector<HTMLElement>('#mode');
  if (!palette || !board || !modeBox) return;
  const paletteElement = palette;
  const boardElement = board;

  const repository = new LocalStorageRegionColorRepository();
  let settings = new RegionColorSettings();
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

  function buildPanel(): void {
    if (panel) panel.remove();
    panel = document.createElement('div');
    panel.className = 'region-color-panel open';
    const size = app.getSize();
    settings.ensureCapacity(size);

    const grid = document.createElement('div');
    grid.className = 'region-color-grid';
    for (let i = 0; i < size; i++) {
      const item = document.createElement('label');
      item.className = 'region-color-item';
      item.innerHTML = `<span>${i + 1}</span>`;

      const picker = document.createElement('input');
      picker.type = 'color';
      picker.className = 'region-color-picker';
      picker.value = settings.colorAt(i);
      picker.title = `色塊 ${i + 1} 顏色`;
      picker.addEventListener('input', () => {
        settings.setColor(i, picker.value);
        void settings.persist(repository);
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
      settings.reset();
      settings.ensureCapacity(app.getSize());
      void settings.persist(repository);
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
    settings.ensureCapacity(snapshot.size);

    const paletteButtons = Array.from(paletteElement.querySelectorAll<HTMLElement>('.colorBtn'));
    for (let i = 0; i < Math.min(snapshot.size, paletteButtons.length); i++) {
      paletteButtons[i].style.background = settings.colorAt(i);
    }

    const boardCells = Array.from(boardElement.querySelectorAll<HTMLElement>('.cell'));
    for (let i = 0; i < Math.min(snapshot.cells.length, boardCells.length); i++) {
      const cell = snapshot.cells[i];
      const element = boardCells[i];
      if (cell.regionId >= 0) {
        element.style.background = settings.colorAt(cell.regionId) ?? DEFAULT_REGION_COLORS[cell.regionId % DEFAULT_REGION_COLORS.length];
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
  observer.observe(paletteElement, { childList: true });
  observer.observe(boardElement, { childList: true });

  for (const eventName of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
    boardElement.addEventListener(eventName, scheduleApply);
  }

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
  void RegionColorSettings.load(repository).then((loaded) => {
    settings = loaded;
    if (panel?.classList.contains('open')) buildPanel();
    applyColors();
  });
}
