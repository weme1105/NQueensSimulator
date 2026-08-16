import type { BoardSnapshot } from './solver/types';

type GuideBridge = {
  getBoard(): BoardSnapshot;
  isPlayMode(): boolean;
};

const COLORS = [
  '#9cc7e8','#b97a56','#38a8bb','#ce6585','#d6a900','#7d68cf','#2f8f55','#85cf72','#ffd97d','#e983d3',
  '#64c96d','#7bb2d8','#ef8a62','#9b8ad6','#5bb7a7','#d77c94','#6f9fd8','#a7c957','#f2a65a','#8d99ae',
];

export function installPlayGuide(app: GuideBridge): void {
  const mode = document.querySelector<HTMLElement>('#mode');
  const board = document.querySelector<HTMLElement>('#board');
  if (!mode || !board) return;

  const style = document.createElement('style');
  style.textContent = `
    .play-guide{display:none;margin-bottom:12px;gap:10px}
    .play-guide.visible{display:grid}
    .guide-card{border:1px solid #eaded8;border-radius:12px;background:#fff;padding:10px 12px}
    .guide-title{font-weight:800;margin-bottom:8px;color:#5b4444}
    .region-legend{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start}
    .region-legend-item{width:50px;text-align:center}
    .region-swatch{height:42px;border-radius:9px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;text-shadow:0 1px 3px #0008;font-size:17px}
    .region-queen-coordinate{height:18px;margin-top:3px;font-size:11px;font-weight:700;color:#6f5b5b;white-space:nowrap}
    .rule-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
    .rule-item{display:flex;align-items:center;gap:10px;border:1px solid #eee3de;border-radius:10px;padding:8px;background:#fffaf8;min-width:0}
    .rule-text{font-size:12px;line-height:1.35;color:#665252}
    .rule-text b{display:block;font-size:13px;margin-bottom:2px}
    .mini-line{display:flex;gap:2px;flex:none}
    .mini-line.vertical{flex-direction:column}
    .mini-cell{width:18px;height:18px;border:1px solid #d9ceca;border-radius:3px;display:flex;align-items:center;justify-content:center;background:#fff;font-size:11px;line-height:1;color:#d9534f;font-weight:800}
    .mini-cell.queen{color:#222;background:#fff7d6}
    .mini-around{display:grid;grid-template-columns:repeat(3,18px);gap:2px;flex:none}
    @media(max-width:850px){
      .region-legend{gap:6px}.region-legend-item{width:43px}.region-swatch{height:38px;font-size:15px}
      .rule-row{grid-template-columns:1fr}.rule-item{padding:7px}.rule-text{font-size:11px}
    }
  `;
  document.head.appendChild(style);

  const guide = document.createElement('div');
  guide.className = 'play-guide';
  guide.innerHTML = `
    <section class="guide-card">
      <div class="guide-title">色塊說明（顏色 = 色塊編號）</div>
      <div class="region-legend"></div>
    </section>
    <section class="guide-card">
      <div class="guide-title">規則說明</div>
      <div class="rule-row">
        <div class="rule-item">
          <div class="mini-line"><span class="mini-cell">×</span><span class="mini-cell">×</span><span class="mini-cell queen">👑</span><span class="mini-cell">×</span><span class="mini-cell">×</span></div>
          <div class="rule-text"><b>Row 規則</b>每一列只能有一個皇后</div>
        </div>
        <div class="rule-item">
          <div class="mini-line vertical"><span class="mini-cell">×</span><span class="mini-cell queen">👑</span><span class="mini-cell">×</span></div>
          <div class="rule-text"><b>Col 規則</b>每一欄只能有一個皇后</div>
        </div>
        <div class="rule-item">
          <div class="mini-around">
            <span class="mini-cell">×</span><span class="mini-cell">×</span><span class="mini-cell">×</span>
            <span class="mini-cell">×</span><span class="mini-cell queen">👑</span><span class="mini-cell">×</span>
            <span class="mini-cell">×</span><span class="mini-cell">×</span><span class="mini-cell">×</span>
          </div>
          <div class="rule-text"><b>周圍不能接觸</b>皇后周圍 8 格不能有其他皇后</div>
        </div>
      </div>
    </section>
  `;
  mode.parentElement?.insertBefore(guide, mode);

  const legend = guide.querySelector<HTMLElement>('.region-legend');
  if (!legend) return;

  let scheduled = false;
  const refresh = (): void => {
    scheduled = false;
    const play = app.isPlayMode();
    guide.classList.toggle('visible', play);
    if (!play) return;

    const snapshot = app.getBoard();
    const queensByRegion = new Map<number, { row: number; col: number }>();
    for (const cell of snapshot.cells) {
      if (cell.state === 2 && cell.regionId >= 0) queensByRegion.set(cell.regionId, { row: cell.row, col: cell.col });
    }

    legend.replaceChildren();
    for (let region = 0; region < snapshot.size; region++) {
      const item = document.createElement('div');
      item.className = 'region-legend-item';
      const queen = queensByRegion.get(region);
      item.innerHTML = `
        <div class="region-swatch" style="background:${COLORS[region % COLORS.length]}">${region + 1}</div>
        <div class="region-queen-coordinate">${queen ? `(${queen.row + 1},${queen.col + 1})` : ''}</div>
      `;
      legend.appendChild(item);
    }
  };

  const schedule = (): void => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refresh);
  };

  new MutationObserver(schedule).observe(board, { childList: true, subtree: true, characterData: true, attributes: true });
  document.querySelector('#play')?.addEventListener('click', () => requestAnimationFrame(schedule));
  document.querySelector('#edit')?.addEventListener('click', () => requestAnimationFrame(schedule));
  document.querySelector('#clear')?.addEventListener('click', () => requestAnimationFrame(schedule));
  document.querySelector('#undo')?.addEventListener('click', () => requestAnimationFrame(schedule));
  schedule();
}
