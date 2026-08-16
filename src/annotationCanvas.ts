type AnnotationBridge = {
  isPlayMode(): boolean;
};

type Point = { x: number; y: number };
type Stroke = {
  points: Point[];
  color: string;
  opacity: number;
  width: number;
  erase: boolean;
};

export function installAnnotationCanvas(app: AnnotationBridge): void {
  const board = document.querySelector<HTMLElement>('#board');
  const clearPlay = document.querySelector<HTMLButtonElement>('#clear');
  if (!board || !board.parentElement) return;

  const style = document.createElement('style');
  style.textContent = `
    .annotation-tools{display:none;align-items:center;gap:7px;flex-wrap:wrap;margin:0 0 10px;padding:8px 10px;border:1px solid #eaded8;border-radius:12px;background:#fffaf8;position:relative;z-index:30}
    body.nq-play-mode .annotation-tools{display:flex}
    .annotation-tools button{padding:7px 9px}
    .annotation-tools button.active{outline:3px solid #444;background:#fff}
    .annotation-tools label{display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap}
    .annotation-tools input[type=color]{width:34px;height:30px;padding:2px;border-radius:7px}
    .annotation-tools input[type=range]{width:86px;padding:0}
    .annotation-wrap{position:relative;width:100%;aspect-ratio:1/1;overflow:visible}
    .annotation-wrap>.board{position:absolute;inset:0;width:100%;height:100%}
    .annotation-canvas{position:absolute;z-index:20;pointer-events:none;touch-action:none;border-radius:7px}
    .annotation-canvas.enabled{pointer-events:auto;cursor:crosshair}
    @media(max-width:850px){.annotation-tools{gap:5px;padding:6px}.annotation-tools label{font-size:10px}.annotation-tools input[type=range]{width:68px}}
  `;
  document.head.appendChild(style);

  const tools = document.createElement('div');
  tools.className = 'annotation-tools';
  tools.innerHTML = `
    <button type="button" class="annotation-toggle">✏️ 畫筆</button>
    <label>顏色 <input class="annotation-color" type="color" value="#ff2d55"></label>
    <label>透明度 <input class="annotation-opacity" type="range" min="10" max="100" value="75"><span class="annotation-opacity-value">75%</span></label>
    <label>粗細 <input class="annotation-width" type="range" min="2" max="30" value="6"><span class="annotation-width-value">6</span></label>
    <button type="button" class="annotation-eraser">橡皮擦</button>
    <button type="button" class="annotation-undo">畫筆上一步</button>
    <button type="button" class="annotation-clear">清除畫筆</button>
  `;

  const wrap = document.createElement('div');
  wrap.className = 'annotation-wrap';
  board.parentElement.insertBefore(tools, board);
  board.parentElement.insertBefore(wrap, board);
  wrap.appendChild(board);

  const canvas = document.createElement('canvas');
  canvas.className = 'annotation-canvas';
  wrap.appendChild(canvas);
  const context = canvas.getContext('2d')!;

  const toggle = tools.querySelector<HTMLButtonElement>('.annotation-toggle')!;
  const color = tools.querySelector<HTMLInputElement>('.annotation-color')!;
  const opacity = tools.querySelector<HTMLInputElement>('.annotation-opacity')!;
  const opacityValue = tools.querySelector<HTMLElement>('.annotation-opacity-value')!;
  const width = tools.querySelector<HTMLInputElement>('.annotation-width')!;
  const widthValue = tools.querySelector<HTMLElement>('.annotation-width-value')!;
  const eraser = tools.querySelector<HTMLButtonElement>('.annotation-eraser')!;
  const undo = tools.querySelector<HTMLButtonElement>('.annotation-undo')!;
  const clear = tools.querySelector<HTMLButtonElement>('.annotation-clear')!;

  let enabled = false;
  let erase = false;
  let drawing = false;
  let activeStroke: Stroke | null = null;
  const strokes: Stroke[] = [];

  const redraw = (): void => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes) drawStroke(stroke);
    if (activeStroke) drawStroke(activeStroke);
  };

  const resize = (): void => {
    const boardRect = board.getBoundingClientRect();
    const firstCell = board.querySelector<HTMLElement>('.cell');
    const cellRect = firstCell?.getBoundingClientRect();
    const extraX = cellRect?.width ?? 0;
    const extraY = cellRect?.height ?? extraX;

    const cssWidth = boardRect.width + extraX * 2;
    const cssHeight = boardRect.height + extraY * 2;
    canvas.style.left = `${-extraX}px`;
    canvas.style.top = `${-extraY}px`;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const nextW = Math.max(1, Math.round(cssWidth * dpr));
    const nextH = Math.max(1, Math.round(cssHeight * dpr));
    if (canvas.width === nextW && canvas.height === nextH) return;
    canvas.width = nextW;
    canvas.height = nextH;
    redraw();
  };

  function drawStroke(stroke: Stroke): void {
    if (stroke.points.length < 2) return;
    const w = canvas.width;
    const h = canvas.height;
    context.save();
    context.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';
    context.globalAlpha = stroke.erase ? 1 : stroke.opacity;
    context.strokeStyle = stroke.color;
    context.lineWidth = stroke.width * (window.devicePixelRatio || 1);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    const first = stroke.points[0];
    context.moveTo(first.x * w, first.y * h);
    for (let i = 1; i < stroke.points.length; i++) {
      const p = stroke.points[i];
      context.lineTo(p.x * w, p.y * h);
    }
    context.stroke();
    context.restore();
  }

  const pointFromEvent = (event: PointerEvent): Point => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  };

  const syncEnabled = (): void => {
    if (!app.isPlayMode()) enabled = false;
    canvas.classList.toggle('enabled', enabled && app.isPlayMode());
    toggle.classList.toggle('active', enabled && app.isPlayMode());
    toggle.textContent = enabled && app.isPlayMode() ? '✏️ 畫筆開啟' : '✏️ 畫筆';
  };

  toggle.addEventListener('click', () => { enabled = !enabled; syncEnabled(); });
  eraser.addEventListener('click', () => { erase = !erase; eraser.classList.toggle('active', erase); });
  opacity.addEventListener('input', () => { opacityValue.textContent = `${opacity.value}%`; });
  width.addEventListener('input', () => { widthValue.textContent = width.value; });
  undo.addEventListener('click', () => { strokes.pop(); redraw(); });
  clear.addEventListener('click', () => { strokes.length = 0; activeStroke = null; redraw(); });

  canvas.addEventListener('pointerdown', (event) => {
    if (!enabled || !app.isPlayMode()) return;
    event.preventDefault();
    drawing = true;
    canvas.setPointerCapture?.(event.pointerId);
    activeStroke = { points: [pointFromEvent(event)], color: color.value, opacity: Number(opacity.value) / 100, width: Number(width.value), erase };
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drawing || !activeStroke) return;
    event.preventDefault();
    activeStroke.points.push(pointFromEvent(event));
    redraw();
  });
  const finish = (event: PointerEvent): void => {
    if (!drawing) return;
    drawing = false;
    try { canvas.releasePointerCapture?.(event.pointerId); } catch { /* noop */ }
    if (activeStroke && activeStroke.points.length > 1) strokes.push(activeStroke);
    activeStroke = null;
    redraw();
  };
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);

  new ResizeObserver(resize).observe(wrap);
  new MutationObserver(() => requestAnimationFrame(resize)).observe(board, { childList: true, subtree: true });
  new MutationObserver(syncEnabled).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  document.querySelector('#play')?.addEventListener('click', () => requestAnimationFrame(() => { resize(); syncEnabled(); }));
  document.querySelector('#edit')?.addEventListener('click', () => requestAnimationFrame(syncEnabled));
  document.querySelector('#new')?.addEventListener('click', () => {
    strokes.length = 0;
    activeStroke = null;
    enabled = false;
    requestAnimationFrame(resize);
    redraw();
    syncEnabled();
  });
  clearPlay?.addEventListener('click', () => requestAnimationFrame(redraw));
  resize();
  syncEnabled();
}
