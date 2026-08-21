type SettingsBridge = {
  isPlayMode(): boolean;
};

type RegionDisplayMode = 'numbers' | 'colors' | 'both';
type DisplaySettings = {
  regionDisplayMode: RegionDisplayMode;
  showCoordinates: boolean;
};

const STORAGE_KEY = 'nq-display-settings-v3';

function loadSettings(): DisplaySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { regionDisplayMode: 'both', showCoordinates: true };
    const parsed = JSON.parse(raw) as Partial<DisplaySettings>;
    const mode: RegionDisplayMode = parsed.regionDisplayMode === 'numbers' || parsed.regionDisplayMode === 'colors' || parsed.regionDisplayMode === 'both' ? parsed.regionDisplayMode : 'both';
    return { regionDisplayMode: mode, showCoordinates: parsed.showCoordinates !== false };
  } catch {
    return { regionDisplayMode: 'both', showCoordinates: true };
  }
}

export function installSettingsPanel(app: SettingsBridge): void {
  const toolbar = document.querySelector<HTMLElement>('.toolbar');
  if (!toolbar) return;

  const style = document.createElement('style');
  style.textContent = `
    .nq-settings-button{margin-left:auto;touch-action:manipulation}
    .nq-settings-backdrop{display:none;position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.28);padding:18px;align-items:center;justify-content:center}
    .nq-settings-backdrop.open{display:flex}
    .nq-settings-dialog{width:min(390px,100%);background:#fff;border:1px solid #eaded8;border-radius:16px;box-shadow:0 18px 48px #0003;padding:16px;color:#5b4444}
    .nq-settings-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.nq-settings-head b{font-size:18px}.nq-settings-close{width:36px;height:36px;padding:0;font-size:20px}
    .nq-settings-section{padding:12px 0;border-top:1px solid #f0e5df}.nq-settings-section:first-of-type{border-top:0}.nq-settings-label{display:block;font-weight:700;margin-bottom:8px}.nq-settings-copy small{display:block;opacity:.7;line-height:1.35;margin-top:4px}
    .nq-region-select{width:100%;padding:10px 12px;border:1px solid #eaded8;border-radius:10px;background:#fff;font:inherit;color:inherit}
    .nq-settings-row{display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:pointer}.nq-switch{position:relative;display:inline-flex;width:48px;height:28px;flex:0 0 auto}.nq-switch input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}.nq-switch span{position:absolute;inset:0;border-radius:999px;background:#d8ccc7;transition:.18s;pointer-events:none}.nq-switch span::after{content:'';position:absolute;width:22px;height:22px;left:3px;top:3px;border-radius:50%;background:#fff;box-shadow:0 1px 4px #0003;transition:.18s}.nq-switch input:checked+span{background:#aa6b6b}.nq-switch input:checked+span::after{transform:translateX(20px)}
    body.nq-region-colors-only #board .region-number{display:none!important}
    body.nq-region-numbers-only #board .cell:not(.unassigned){background:#fff!important;color:#5b4444!important}
    body.nq-region-numbers-only #board .region-number{color:#6b5757!important;text-shadow:none!important;font-weight:800;z-index:4}
    body.nq-region-numbers-only #board .mark{color:#5b4444!important;text-shadow:none!important}
    body.nq-region-numbers-only #board .cell:has(.mark:not(:empty)){
      background-image:
        radial-gradient(ellipse 29% 25% at 50% 50%,#fff 0 78%,transparent 80%),
        repeating-linear-gradient(135deg,rgba(91,68,68,.28) 0,rgba(91,68,68,.28) 3px,transparent 3px,transparent 9px)!important;
    }
    body.nq-region-numbers-only #board .cell:has(.mark:not(:empty)) .mark{font-size:0!important}
    body.nq-region-numbers-only #board .cell:has(.mark:not(:empty)) .mark::after{content:''}
    body.nq-region-numbers-only #board .cell:has(.queen),body.nq-region-numbers-only #board .cell:has(.crown){background-image:none!important}
    body.nq-region-numbers-only #board .cell:has(.queen) .mark,body.nq-region-numbers-only #board .cell:has(.crown) .mark{font-size:inherit!important}
    body.nq-hide-coordinates #board .cell-coordinate{display:none!important}
    @media(max-width:850px){.nq-settings-button{margin-left:0}.nq-settings-backdrop{padding:12px}.nq-settings-dialog{padding:14px}}
  `;
  document.head.appendChild(style);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nq-settings-button';
  button.textContent = '⚙ 設定';
  toolbar.appendChild(button);

  const backdrop = document.createElement('div');
  backdrop.className = 'nq-settings-backdrop';
  backdrop.innerHTML = `
    <div class="nq-settings-dialog" role="dialog" aria-modal="true" aria-label="顯示設定">
      <div class="nq-settings-head"><b>顯示設定</b><button type="button" class="nq-settings-close" aria-label="關閉設定">×</button></div>
      <div class="nq-settings-section">
        <label class="nq-settings-label" for="nq-region-display-select">色塊顯示方式</label>
        <select id="nq-region-display-select" class="nq-region-select">
          <option value="numbers">只顯示色塊號碼</option>
          <option value="colors">只顯示色塊顏色</option>
          <option value="both">顯示色塊號碼跟顏色</option>
        </select>
      </div>
      <label class="nq-settings-section nq-settings-row">
        <span class="nq-settings-copy"><span>顯示座標</span><small>控制棋盤格內的 (X,Y) 座標顯示。</small></span>
        <span class="nq-switch"><input type="checkbox" class="nq-show-coordinates" aria-label="顯示座標"><span></span></span>
      </label>
    </div>`;
  document.body.appendChild(backdrop);

  const close = backdrop.querySelector<HTMLButtonElement>('.nq-settings-close')!;
  const regionSelect = backdrop.querySelector<HTMLSelectElement>('.nq-region-select')!;
  const showCoordinates = backdrop.querySelector<HTMLInputElement>('.nq-show-coordinates')!;
  let settings = loadSettings();

  const apply = (): void => {
    document.body.classList.toggle('nq-region-numbers-only', settings.regionDisplayMode === 'numbers');
    document.body.classList.toggle('nq-region-colors-only', settings.regionDisplayMode === 'colors');
    regionSelect.value = settings.regionDisplayMode;
    document.body.classList.toggle('nq-hide-coordinates', !settings.showCoordinates);
    showCoordinates.checked = settings.showCoordinates;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* web storage may be unavailable */ }
  };

  const open = (): void => { backdrop.classList.add('open'); requestAnimationFrame(() => close.focus()); };
  const hide = (): void => { backdrop.classList.remove('open'); button.focus(); };

  button.addEventListener('click', open);
  close.addEventListener('click', hide);
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) hide(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && backdrop.classList.contains('open')) hide(); });
  regionSelect.addEventListener('change', () => {
    settings = { ...settings, regionDisplayMode: regionSelect.value as RegionDisplayMode };
    apply();
  });
  showCoordinates.addEventListener('change', () => {
    settings = { ...settings, showCoordinates: showCoordinates.checked };
    apply();
  });

  new MutationObserver(() => {
    if (!app.isPlayMode()) backdrop.classList.remove('open');
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  apply();
}
