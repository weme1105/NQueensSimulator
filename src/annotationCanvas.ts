type AnnotationBridge = {
  isPlayMode(): boolean;
};

type Point = { x: number; y: number };
type Stroke = {
  type: 'stroke';
  points: Point[];
  color: string;
  opacity: number;
  width: number;
  erase: boolean;
};
type TextBox = {
  type: 'text';
  point: Point;
  text: string;
  color: string;
  opacity: number;
  fontSize: number;
};
type Annotation = Stroke | TextBox;

export function installAnnotationCanvas(app: AnnotationBridge): void {
  const board = document.querySelector<HTMLElement>('#board');
  const clearPlay = document.querySelector<HTMLButtonElement>('#clear');
  if (!board || !board.parentElement) return;

  const style = document.createElement('style');
  style.textContent = `
    .annotation-tools{display:none;flex-direction:column;align-items:stretch;gap:6px;margin:0 0 10px;padding:8px 10px;border:1px solid #eaded8;border-radius:12px;background:#fffaf8;position:relative;z-index:30}
    body.nq-play-mode .annotation-tools{display:flex}
    .annotation-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
    .annotation-tools button{padding:7px 9px}
    .annotation-tools button.active{outline:3px solid #444;background:#fff}
    .annotation-tools label{display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap}
    .annotation-tools input[type=color]{width:34px;height:30px;padding:2px;border-radius:7px}
    .annotation-tools input[type=range]{width:86px;padding:0}
    .annotation-text{min-width:120px;flex:1 1 180px;max-width:300px;height:31px;padding:4px 8px;border:1px solid #d8cbc6;border-radius:7px;background:#fff}
    .annotation-wrap{position:relative;width:100%;aspect-ratio:1/1;overflow:visible}
    .annotation-wrap>.board{position:absolute;inset:0;width:100%;height:100%}
    .annotation-canvas{position:absolute;z-index:20;pointer-events:none;touch-action:none;border-radius:7px}
    .annotation-canvas.enabled{pointer-events:auto;cursor:crosshair}
    @media(max-width:850px){
      .annotation-tools{gap:5px;padding:6px}
      .annotation-row{gap:5px}
      .annotation-tools label{font-size:10px}
      .annotation-tools input[type=range]{width:68px}
      .annotation-text{min-width:100px;max-width:none}
    }
  `;
  document.head.appendChild(style);

  const tools = document.createElement('div');
  tools.className = 'annotation-tools';
  tools.innerHTML = `
    <div class="annotation-row annotation-row-primary">
      <button type="button" class="annotation-toggle">✏️ 畫筆</button>
      <label>顏色 <input class="annotation-color" type="color" value="#ff2d55"></label>
      <label>透明度 <input class="annotation-opacity" type="range" min="10" max="100" value="75"><span class="annotation-opacity-value">75%</span></label>
      <label>粗細 <input class="annotation-width" type="range" min="2" max="30" value="6"><span class="annotation-width-value">6</span></label>
    </div>
    <div class="annotation-row annotation-row-secondary">
      <button type="button" class="annotation-eraser">橡皮擦</button>
      <button type="button" class="annotation-undo">還原</button>
      <button type="button" class="annotation-clear">清除</button>
      <input class="annotation-text" type="text" maxlength="80" placeholder="輸入文字後按「文字框」，再點棋盤位置">
      <button type="button" class="annotation-text-mode">🔤 文字框</button>
    </div>
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
  const textInput = tools.querySelector<HTMLInputElement>('.annotation-text')!;
  const textModeButton = tools.querySelector<HTMLButtonElement>('.annotation-text-mode')!;

  let enabled = false;
  let erase = false;
  let textMode = false;
  let drawing = false;
  let activeStroke: Stroke | null = null;
  const annotations: Annotation[] = [];

  const redraw = (): void => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const annotation of annotations) drawAnnotation(annotation);
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

  function drawAnnotation(annotation: Annotation): void {
    if (annotation.type === 'stroke') drawStroke(annotation);
    else drawTextBox(annotation);
  }

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

  function drawTextBox(box: TextBox): void {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const x = box.point.x * canvas.width;
    const y = box.point.y * canvas.height;
    const fontPx = box.fontSize * dpr;
    const paddingX = 8 * dpr;
    const paddingY = 6 * dpr;

    context.save();
    context.globalAlpha = box.opacity;
    context.font = `700 ${fontPx}px sans-serif`;
    context.textBaseline = 'top';
    const textWidth = context.measureText(box.text).width;
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = fontPx * 1.25 + paddingY * 2;

    context.fillStyle = 'rgba(255,255,255,.88)';
    context.strokeStyle = box.color;
    context.lineWidth = Math.max(2, 2 * dpr);
    context.fillRect(x, y, boxWidth, boxHeight);
    context.strokeRect(x, y, boxWidth, boxHeight);
    context.fillStyle = box.color;
    context.fillText(box.text, x + paddingX, y + paddingY);
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
    toggle.classList.toggle('active', enabled && app.isPlayMode() && !textMode);
    textModeButton.classList.toggle('active', enabled && app.isPlayMode() && textMode);
    eraser.classList.toggle('active', enabled && app.isPlayMode() && erase && !textMode);
    toggle.textContent = enabled && app.isPlayMode() && !textMode ? '✏️ 畫筆開啟' : '✏️ 畫筆';
  };

  toggle.addEventListener('click', () => {
    if (enabled && !textMode) enabled = false;
    else {
      enabled = true;
      textMode = false;
      erase = false;
    }
    syncEnabled();
  });
  eraser.addEventListener('click', () => {
    enabled = true;
    textMode = false;
    erase = !erase;
    syncEnabled();
  });
  textModeButton.addEventListener('click', () => {
    if (!textInput.value.trim()) {
      textInput.focus();
      return;
    }
    enabled = true;
    erase = false;
    textMode = !textMode;
    syncEnabled();
  });
  opacity.addEventListener('input', () => { opacityValue.textContent = `${opacity.value}%`; });
  width.addEventListener('input', () => { widthValue.textContent = width.value; });
  undo.addEventListener('click', () => { annotations.pop(); redraw(); });
  clear.addEventListener('click', () => { annotations.length = 0; activeStroke = null; redraw(); });

  canvas.addEventListener('pointerdown', (event) => {
    if (!enabled || !app.isPlayMode()) return;
    event.preventDefault();

    if (textMode) {
      const text = textInput.value.trim();
      if (!text) return;
      annotations.push({
        type: 'text',
        point: pointFromEvent(event),
        text,
        color: color.value,
        opacity: Number(opacity.value) / 100,
        fontSize: Math.max(12, Number(width.value) * 2 + 8),
      });
      redraw();
      return;
    }

    drawing = true;
    canvas.setPointerCapture?.(event.pointerId);
    activeStroke = {
      type: 'stroke',
      points: [pointFromEvent(event)],
      color: color.value,
      opacity: Number(opacity.value) / 100,
      width: Number(width.value),
      erase,
    };
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
    if (activeStroke && activeStroke.points.length > 1) annotations.push(activeStroke);
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
    annotations.length = 0;
    activeStroke = null;
    enabled = false;
    textMode = false;
    requestAnimationFrame(resize);
    redraw();
    syncEnabled();
  });
  clearPlay?.addEventListener('click', () => requestAnimationFrame(redraw));
  resize();
  syncEnabled();
}
