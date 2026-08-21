type SettingsBridge = {
  isPlayMode(): boolean;
};

type DisplaySettings = {
  showRegionNumbers: boolean;
  showCoordinates: boolean;
};

const STORAGE_KEY = 'nq-display-settings-v2';

function loadSettings(): DisplaySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { showRegionNumbers: true, showCoordinates: true };
    const parsed = JSON.parse(raw) as Partial<DisplaySettings>;
    return {
      showRegionNumbers: parsed.showRegionNumbers !== false,
      showCoordinates: parsed.showCoordinates !== false,
    };
  } catch {
    return { showRegionNumbers: true, showCoordinates: true };
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
    .nq-settings-dialog{width:min(360px,100%);background:#fff;border:1px solid #eaded8;border-radius:16px;box-shadow:0 18px 48px #0003;padding:16px;color:#5b4444}
    .nq-settings-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.nq-settings-head b{font-size:18px}.nq-settings-close{width:36px;height:36px;padding:0;font-size:20px}
    .nq-settings-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0;border-top:1px solid #f0e5df}.nq-settings-row:first-of-type{border-top:0}.nq-settings-copy{display:flex;flex-direction:column;gap:3px}.nq-settings-copy small{opacity:.7;line-height:1.35}
    .nq-switch{position:relative;display:inline-flex;width:48px;height:28px;flex:0 0 auto}.nq-switch input{position:absolute;opacity:0;pointer-events:none}.nq-switch span{position:absolute;inset:0;border-radius:999px;background:#d8ccc7;transition:.18s}.nq-switch span::after{content:'';position:absolute;width:22px;height:22px;left:3px;top:3px;border-radius:50%;background:#fff;box-shadow:0 1px 4px #0003;transition:.18s}.nq-switch input:checked+span{background:#aa6b6b}.nq-switch input:checked+span::after{transform:translateX(20px)}
    body.nq-hide-region-numbers #board .region-number{display:none!important}
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
      <label class="nq-settings-row">
        <span class="nq-settings-copy"><span>顯示色塊號碼</span><small>控制色塊中央的 Region 編號顯示；色塊顏色與邊界不受影響。</small></span>
        <span class="nq-switch"><input type="checkbox" class="nq-show-region-numbers"><span></span></span>
      </label>
      <label class="nq-settings-row">
        <span class="nq-settings-copy"><span>顯示座標</span><small>控制棋盤格內的 (X,Y) 座標顯示。</small></span>
        <span class="nq-switch"><input type="checkbox" class="nq-show-coordinates"><span></span></span>
      </label>
    </div>`;
  document.body.appendChild(backdrop);

  const close = backdrop.querySelector<HTMLButtonElement>('.nq-settings-close')!;
  const showRegionNumbers = backdrop.querySelector<HTMLInputElement>('.nq-show-region-numbers')!;
  const showCoordinates = backdrop.querySelector<HTMLInputElement>('.nq-show-coordinates')!;
  let settings = loadSettings();

  const apply = (): void => {
    document.body.classList.toggle('nq-hide-region-numbers', !settings.showRegionNumbers);
    document.body.classList.toggle('nq-hide-coordinates', !settings.showCoordinates);
    showRegionNumbers.checked = settings.showRegionNumbers;
    showCoordinates.checked = settings.showCoordinates;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* web storage may be unavailable */ }
  };

  const open = (): void => { backdrop.classList.add('open'); requestAnimationFrame(() => close.focus()); };
  const hide = (): void => { backdrop.classList.remove('open'); button.focus(); };

  button.addEventListener('click', open);
  close.addEventListener('click', hide);
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) hide(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && backdrop.classList.contains('open')) hide(); });
  showRegionNumbers.addEventListener('change', () => { settings = { ...settings, showRegionNumbers: showRegionNumbers.checked }; apply(); });
  showCoordinates.addEventListener('change', () => { settings = { ...settings, showCoordinates: showCoordinates.checked }; apply(); });

  new MutationObserver(() => {
    if (!app.isPlayMode()) backdrop.classList.remove('open');
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  apply();
}
