type AnnotationBridge = {
  isPlayMode(): boolean;
};

type Point = { x: number; y: number };
type Stroke = { type:'stroke'; points:Point[]; color:string; opacity:number; width:number; erase:boolean };
type TextBox = { type:'text'; point:Point; text:string; color:string; opacity:number; fontSize:number };
type Annotation = Stroke | TextBox;

export function installAnnotationCanvas(app: AnnotationBridge): void {
  const board=document.querySelector<HTMLElement>('#board');
  const history=document.querySelector<HTMLElement>('#history');
  if(!board||!board.parentElement) return;

  const style=document.createElement('style');
  style.textContent=`
    .annotation-tools{display:none;flex-direction:column;align-items:stretch;gap:6px;margin:0 0 10px;padding:8px 10px;border:1px solid #eaded8;border-radius:12px;background:#fffaf8;position:relative;z-index:30}
    body.nq-play-mode .annotation-tools{display:flex}.annotation-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.annotation-tools button{padding:7px 9px}.annotation-tools button.active{outline:3px solid #444;background:#fff}.annotation-tools label{display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap}.annotation-tools input[type=color]{width:34px;height:30px;padding:2px;border-radius:7px}.annotation-tools input[type=range]{width:86px;padding:0}
    .annotation-wrap{position:relative;width:100%;aspect-ratio:1/1;overflow:visible}.annotation-wrap>.board{position:absolute;inset:0;width:100%;height:100%}.annotation-canvas{position:absolute;z-index:20;pointer-events:none;touch-action:none;border-radius:7px}.annotation-canvas.enabled{pointer-events:auto;cursor:crosshair}
    .annotation-note{display:none;margin-top:12px;padding-top:10px;border-top:1px solid #eaded8}.annotation-note-title{font-weight:800;margin-bottom:6px}.annotation-note textarea{width:100%;min-height:82px;resize:vertical;padding:9px 10px;border:1px solid #d8cbc6;border-radius:9px;background:#fff;font:inherit;line-height:1.45}.annotation-note-hint{font-size:11px;margin-top:5px;opacity:.72}
    body.nq-play-mode .annotation-note{display:block}
    #history{max-height:none;overflow-y:visible}#history.history-scroll{max-height:520px;overflow-y:auto;overscroll-behavior:contain;padding-right:4px}
    @media(max-width:850px){.annotation-tools{gap:5px;padding:6px}.annotation-row{gap:5px}.annotation-tools label{font-size:10px}.annotation-tools input[type=range]{width:68px}#history.history-scroll{max-height:300px}}
  `;document.head.appendChild(style);

  const tools=document.createElement('div');tools.className='annotation-tools';tools.innerHTML=`
    <div class="annotation-row"><button type="button" class="annotation-toggle">✏️ 畫筆</button><label>顏色 <input class="annotation-color" type="color" value="#ff2d55"></label><label>透明度 <input class="annotation-opacity" type="range" min="10" max="100" value="75"><span class="annotation-opacity-value">75%</span></label><label>粗細 <input class="annotation-width" type="range" min="2" max="30" value="6"><span class="annotation-width-value">6</span></label></div>
    <div class="annotation-row"><button type="button" class="annotation-eraser">橡皮擦</button><button type="button" class="annotation-undo">還原</button><button type="button" class="annotation-clear">清除</button></div>`;
  board.parentElement.insertBefore(tools,board);

  const wrap=document.createElement('div');wrap.className='annotation-wrap';board.parentElement.insertBefore(wrap,board);wrap.appendChild(board);
  const canvas=document.createElement('canvas');canvas.className='annotation-canvas';wrap.appendChild(canvas);const ctx=canvas.getContext('2d')!;

  const note=document.createElement('div');note.className='annotation-note';note.innerHTML=`<div class="annotation-note-title">文字註記</div><textarea class="annotation-text" maxlength="500" placeholder="輸入文字後，點棋盤上的位置即可放上文字"></textarea><div class="annotation-note-hint">有輸入文字時，點一下棋盤會放置文字；清空文字後恢復畫筆操作。</div>`;history?.parentElement?.appendChild(note);
  const textInput=note.querySelector<HTMLTextAreaElement>('.annotation-text')!;
  const toggle=tools.querySelector<HTMLButtonElement>('.annotation-toggle')!,color=tools.querySelector<HTMLInputElement>('.annotation-color')!,opacity=tools.querySelector<HTMLInputElement>('.annotation-opacity')!,opacityValue=tools.querySelector<HTMLElement>('.annotation-opacity-value')!,width=tools.querySelector<HTMLInputElement>('.annotation-width')!,widthValue=tools.querySelector<HTMLElement>('.annotation-width-value')!,eraser=tools.querySelector<HTMLButtonElement>('.annotation-eraser')!,undo=tools.querySelector<HTMLButtonElement>('.annotation-undo')!,clear=tools.querySelector<HTMLButtonElement>('.annotation-clear')!;

  let enabled=false,erase=false,drawing=false,active:Stroke|null=null;const annotations:Annotation[]=[];
  const drawStroke=(s:Stroke)=>{if(s.points.length<2)return;ctx.save();ctx.globalCompositeOperation=s.erase?'destination-out':'source-over';ctx.globalAlpha=s.erase?1:s.opacity;ctx.strokeStyle=s.color;ctx.lineWidth=s.width*(devicePixelRatio||1);ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(s.points[0].x*canvas.width,s.points[0].y*canvas.height);for(let i=1;i<s.points.length;i++)ctx.lineTo(s.points[i].x*canvas.width,s.points[i].y*canvas.height);ctx.stroke();ctx.restore()};
  const drawText=(b:TextBox)=>{const d=Math.max(1,devicePixelRatio||1),x=b.point.x*canvas.width,y=b.point.y*canvas.height,f=b.fontSize*d;ctx.save();ctx.globalAlpha=b.opacity;ctx.font=`700 ${f}px sans-serif`;ctx.textBaseline='top';ctx.fillStyle=b.color;ctx.fillText(b.text,x,y);ctx.restore()};
  const redraw=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);for(const a of annotations)a.type==='stroke'?drawStroke(a):drawText(a);if(active)drawStroke(active)};
  const resize=()=>{const br=board.getBoundingClientRect(),cr=board.querySelector<HTMLElement>('.cell')?.getBoundingClientRect(),ex=cr?.width??0,ey=cr?.height??ex,w=br.width+ex*2,h=br.height+ey*2;canvas.style.left=`${-ex}px`;canvas.style.top=`${-ey}px`;canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;const d=Math.max(1,devicePixelRatio||1),nw=Math.max(1,Math.round(w*d)),nh=Math.max(1,Math.round(h*d));if(canvas.width!==nw||canvas.height!==nh){canvas.width=nw;canvas.height=nh;redraw()}};
  const point=(e:PointerEvent):Point=>{const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))}};
  const sync=()=>{if(!app.isPlayMode())enabled=false;canvas.classList.toggle('enabled',enabled&&app.isPlayMode());toggle.classList.toggle('active',enabled&&app.isPlayMode()&&!erase);eraser.classList.toggle('active',enabled&&app.isPlayMode()&&erase);toggle.textContent=enabled&&app.isPlayMode()&&!erase?'✏️ 畫筆開啟':'✏️ 畫筆'};
  const updateHistoryScroll=()=>{if(!history)return;requestAnimationFrame(()=>history.classList.toggle('history-scroll',history.scrollHeight>520))};
  if(history)new MutationObserver(updateHistoryScroll).observe(history,{childList:true,subtree:true,characterData:true});
  toggle.onclick=()=>{enabled=!enabled;erase=false;sync()};eraser.onclick=()=>{enabled=true;erase=!erase;sync()};opacity.oninput=()=>opacityValue.textContent=`${opacity.value}%`;width.oninput=()=>widthValue.textContent=width.value;undo.onclick=()=>{annotations.pop();redraw()};clear.onclick=()=>{annotations.length=0;active=null;redraw()};
  canvas.onpointerdown=e=>{if(!enabled||!app.isPlayMode())return;e.preventDefault();const text=textInput.value.trim();if(text){annotations.push({type:'text',point:point(e),text,color:color.value,opacity:+opacity.value/100,fontSize:Math.max(12,+width.value*2+8)});redraw();return}drawing=true;canvas.setPointerCapture?.(e.pointerId);active={type:'stroke',points:[point(e)],color:color.value,opacity:+opacity.value/100,width:+width.value,erase}};
  canvas.onpointermove=e=>{if(!drawing||!active)return;e.preventDefault();active.points.push(point(e));redraw()};const finish=(e:PointerEvent)=>{if(!drawing)return;drawing=false;try{canvas.releasePointerCapture?.(e.pointerId)}catch{}if(active&&active.points.length>1)annotations.push(active);active=null;redraw()};canvas.onpointerup=finish;canvas.onpointercancel=finish;
  new ResizeObserver(resize).observe(wrap);new MutationObserver(()=>requestAnimationFrame(resize)).observe(board,{childList:true,subtree:true});new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});document.querySelector('#play')?.addEventListener('click',()=>requestAnimationFrame(()=>{resize();sync();updateHistoryScroll()}));document.querySelector('#edit')?.addEventListener('click',()=>requestAnimationFrame(sync));document.querySelector('#new')?.addEventListener('click',()=>{annotations.length=0;active=null;enabled=false;textInput.value='';requestAnimationFrame(resize);redraw();sync()});
  resize();sync();updateHistoryScroll();
}
