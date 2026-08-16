type AnnotationBridge = {
  isPlayMode(): boolean;
};

type Point = { x: number; y: number };
type Stroke = { points:Point[]; color:string; opacity:number; width:number; erase:boolean };
type TimelineEntry = { id:number; type:'action'|'note'; text:string };

export function installAnnotationCanvas(app: AnnotationBridge): void {
  const board=document.querySelector<HTMLElement>('#board');
  const history=document.querySelector<HTMLElement>('#history');
  if(!board||!board.parentElement) return;

  // Explicit favicon prevents the browser from falling back to /favicon.ico.
  if(!document.querySelector('link[rel~="icon"]')){
    const icon=document.createElement('link');
    icon.rel='icon';
    icon.type='image/svg+xml';
    icon.href=new URL('favicon.svg',document.baseURI).href;
    document.head.appendChild(icon);
  }

  const style=document.createElement('style');
  style.textContent=`
    .annotation-tools{display:none;flex-direction:column;align-items:stretch;gap:6px;margin:0 0 10px;padding:8px 10px;border:1px solid #eaded8;border-radius:12px;background:#fffaf8;position:relative;z-index:30}
    body.nq-play-mode .annotation-tools{display:flex}.annotation-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.annotation-tools button{padding:7px 9px}.annotation-tools button.active{outline:3px solid #444;background:#fff}.annotation-tools label{display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap}.annotation-tools input[type=color]{width:34px;height:30px;padding:2px;border-radius:7px}.annotation-tools input[type=range]{width:86px;padding:0}
    .annotation-tools #stepSolve,.annotation-tools #autoQueen{display:inline-block!important;margin:0}
    #solver:empty{display:none!important;margin:0!important}
    .annotation-wrap{position:relative;width:100%;aspect-ratio:1/1;overflow:visible}.annotation-wrap>.board{position:absolute;inset:0;width:100%;height:100%}.annotation-canvas{position:absolute;z-index:20;pointer-events:none;touch-action:none;border-radius:7px}.annotation-canvas.enabled{pointer-events:auto;cursor:crosshair}
    .annotation-note{display:none;margin-top:12px;padding-top:10px;border-top:1px solid #eaded8}.annotation-note-title{font-weight:800;margin-bottom:6px}.annotation-note textarea{width:100%;min-height:110px;resize:vertical;padding:9px 10px;border:1px solid #d8cbc6;border-radius:9px;background:#fff;font:inherit;line-height:1.45}.annotation-note-actions{display:flex;justify-content:flex-end;margin-top:6px}.annotation-note-actions button{padding:7px 12px}.annotation-note-hint{font-size:11px;margin-top:5px;opacity:.72}body.nq-play-mode .annotation-note{display:block}
    .user-note{border-left:4px solid #aa6b6b!important;background:#fff7f3!important;white-space:pre-wrap;word-break:break-word}.user-note::before{content:'說明：';font-weight:800;margin-right:4px}
    #history{max-height:none;overflow-y:visible}#history.history-scroll{max-height:520px;overflow-y:auto;overscroll-behavior:contain;padding-right:4px}
    @media(max-width:850px){.annotation-tools{gap:5px;padding:6px}.annotation-row{gap:5px}.annotation-tools label{font-size:10px}.annotation-tools input[type=range]{width:68px}#history.history-scroll{max-height:300px}}
  `;document.head.appendChild(style);

  const tools=document.createElement('div');tools.className='annotation-tools';tools.innerHTML=`<div class="annotation-row"><button type="button" class="annotation-toggle">✏️ 畫筆</button><label>顏色 <input class="annotation-color" type="color" value="#ff2d55"></label><label>透明度 <input class="annotation-opacity" type="range" min="10" max="100" value="75"><span class="annotation-opacity-value">75%</span></label><label>粗細 <input class="annotation-width" type="range" min="2" max="30" value="6"><span class="annotation-width-value">6</span></label></div><div class="annotation-row"><button type="button" class="annotation-eraser">橡皮擦</button><button type="button" class="annotation-undo">還原</button><button type="button" class="annotation-clear">清除</button></div>`;board.parentElement.insertBefore(tools,board);

  // Keep the existing solver buttons and handlers; only move their DOM position so
  // frequently used deduction actions sit beside the drawing controls.
  const actionRow=tools.querySelectorAll<HTMLElement>('.annotation-row')[1];
  const eraserButton=tools.querySelector<HTMLButtonElement>('.annotation-eraser');
  const stepSolve=document.querySelector<HTMLButtonElement>('#stepSolve');
  const autoQueen=document.querySelector<HTMLButtonElement>('#autoQueen');
  if(actionRow&&eraserButton){
    let anchor:Element=eraserButton;
    for(const button of [stepSolve,autoQueen]){
      if(!button) continue;
      anchor.insertAdjacentElement('afterend',button);
      anchor=button;
    }
  }

  const wrap=document.createElement('div');wrap.className='annotation-wrap';board.parentElement.insertBefore(wrap,board);wrap.appendChild(board);const canvas=document.createElement('canvas');canvas.className='annotation-canvas';wrap.appendChild(canvas);const ctx=canvas.getContext('2d')!;
  const note=document.createElement('div');note.className='annotation-note';note.innerHTML=`<div class="annotation-note-title">說明文字</div><textarea maxlength="2000" placeholder="輸入推演想法、假設或備註……"></textarea><div class="annotation-note-actions"><button type="button" class="annotation-note-submit">加入紀錄</button></div><div class="annotation-note-hint">加入紀錄視同一次操作，會依發生順序加在操作紀錄最後。Ctrl + Enter 也可送出。</div>`;history?.parentElement?.appendChild(note);
  const noteInput=note.querySelector<HTMLTextAreaElement>('textarea')!,noteSubmit=note.querySelector<HTMLButtonElement>('.annotation-note-submit')!;

  const toggle=tools.querySelector<HTMLButtonElement>('.annotation-toggle')!,color=tools.querySelector<HTMLInputElement>('.annotation-color')!,opacity=tools.querySelector<HTMLInputElement>('.annotation-opacity')!,opacityValue=tools.querySelector<HTMLElement>('.annotation-opacity-value')!,width=tools.querySelector<HTMLInputElement>('.annotation-width')!,widthValue=tools.querySelector<HTMLElement>('.annotation-width-value')!,eraser=tools.querySelector<HTMLButtonElement>('.annotation-eraser')!,undo=tools.querySelector<HTMLButtonElement>('.annotation-undo')!,clear=tools.querySelector<HTMLButtonElement>('.annotation-clear')!;
  let enabled=false,erase=false,drawing=false,active:Stroke|null=null;const strokes:Stroke[]=[];

  // History timeline: the legacy UI renders newest-first. We capture each new legacy
  // action, then render one chronological timeline so manual notes and board actions
  // are interleaved exactly in the order they happened.
  const timeline:TimelineEntry[]=[];let timelineSeq=0,lastActionCount=0;
  const steps=document.querySelector<HTMLElement>('#steps');
  const noteCount=()=>timeline.reduce((n,e)=>n+(e.type==='note'?1:0),0);
  const syncStepCount=()=>{if(steps)steps.textContent=String(lastActionCount+noteCount())};
  const updateHistoryScroll=()=>{if(!history)return;requestAnimationFrame(()=>{const limit=window.innerWidth<=850?300:520;history.classList.toggle('history-scroll',history.scrollHeight>limit)})};
  const renderTimeline=(scrollBottom=false)=>{if(!history)return;history.replaceChildren();if(!timeline.length){history.textContent='目前沒有操作。'}else{for(const entry of timeline){const el=document.createElement('div');el.className='item'+(entry.type==='note'?' user-note':'');el.dataset.timelineManaged='1';el.dataset.timelineId=String(entry.id);el.textContent=entry.text;history.appendChild(el)}}syncStepCount();updateHistoryScroll();if(scrollBottom)requestAnimationFrame(()=>{history.scrollTop=history.scrollHeight})};
  const removeLatestActions=(count:number)=>{for(let removed=0;removed<count;){const i=timeline.map(e=>e.type).lastIndexOf('action');if(i<0)break;timeline.splice(i,1);removed++}};
  const captureLegacyHistory=()=>{if(!history)return;const raw=Array.from(history.querySelectorAll<HTMLElement>('.item:not([data-timeline-managed])'));if(!raw.length&&history.querySelector('[data-timeline-managed]'))return;const count=raw.length;if(count>lastActionCount){const added=raw.slice(0,count-lastActionCount).reverse();for(const el of added)timeline.push({id:++timelineSeq,type:'action',text:el.textContent?.trim()||''})}else if(count<lastActionCount){removeLatestActions(lastActionCount-count)}lastActionCount=count;renderTimeline(count>0)};
  if(history){const initial=Array.from(history.querySelectorAll<HTMLElement>('.item'));if(initial.length){for(const el of initial.reverse())timeline.push({id:++timelineSeq,type:'action',text:el.textContent?.trim()||''});lastActionCount=initial.length;renderTimeline()}new MutationObserver(()=>requestAnimationFrame(captureLegacyHistory)).observe(history,{childList:true,subtree:true,characterData:true})}

  const submitNote=()=>{const text=noteInput.value.trim();if(!text)return;timeline.push({id:++timelineSeq,type:'note',text});noteInput.value='';renderTimeline(true);noteInput.focus()};noteSubmit.onclick=submitNote;noteInput.addEventListener('keydown',e=>{if(e.ctrlKey&&e.key==='Enter'){e.preventDefault();submitNote()}});
  // If the latest logical operation is a note, 上一步 removes that note first.
  document.querySelector('#undo')?.addEventListener('click',e=>{const last=timeline[timeline.length-1];if(last?.type==='note'){e.preventDefault();e.stopImmediatePropagation();timeline.pop();renderTimeline(true)}},true);

  const draw=(s:Stroke)=>{if(s.points.length<2)return;ctx.save();ctx.globalCompositeOperation=s.erase?'destination-out':'source-over';ctx.globalAlpha=s.erase?1:s.opacity;ctx.strokeStyle=s.color;ctx.lineWidth=s.width*(devicePixelRatio||1);ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(s.points[0].x*canvas.width,s.points[0].y*canvas.height);for(let i=1;i<s.points.length;i++)ctx.lineTo(s.points[i].x*canvas.width,s.points[i].y*canvas.height);ctx.stroke();ctx.restore()};
  const redraw=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);for(const s of strokes)draw(s);if(active)draw(active)};
  const resize=()=>{const br=board.getBoundingClientRect(),cr=board.querySelector<HTMLElement>('.cell')?.getBoundingClientRect(),ex=cr?.width??0,ey=cr?.height??ex,w=br.width+ex*2,h=br.height+ey*2;canvas.style.left=`${-ex}px`;canvas.style.top=`${-ey}px`;canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;const d=Math.max(1,devicePixelRatio||1),nw=Math.max(1,Math.round(w*d)),nh=Math.max(1,Math.round(h*d));if(canvas.width!==nw||canvas.height!==nh){canvas.width=nw;canvas.height=nh;redraw()}};
  const point=(e:PointerEvent):Point=>{const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))}};
  const sync=()=>{if(!app.isPlayMode())enabled=false;canvas.classList.toggle('enabled',enabled&&app.isPlayMode());toggle.classList.toggle('active',enabled&&app.isPlayMode()&&!erase);eraser.classList.toggle('active',enabled&&app.isPlayMode()&&erase);toggle.textContent=enabled&&app.isPlayMode()&&!erase?'✏️ 畫筆開啟':'✏️ 畫筆'};
  toggle.onclick=()=>{enabled=!enabled;erase=false;sync()};eraser.onclick=()=>{enabled=true;erase=!erase;sync()};opacity.oninput=()=>opacityValue.textContent=`${opacity.value}%`;width.oninput=()=>widthValue.textContent=width.value;undo.onclick=()=>{strokes.pop();redraw()};clear.onclick=()=>{strokes.length=0;active=null;redraw()};
  canvas.onpointerdown=e=>{if(!enabled||!app.isPlayMode())return;e.preventDefault();drawing=true;canvas.setPointerCapture?.(e.pointerId);active={points:[point(e)],color:color.value,opacity:+opacity.value/100,width:+width.value,erase}};canvas.onpointermove=e=>{if(!drawing||!active)return;e.preventDefault();active.points.push(point(e));redraw()};const finish=(e:PointerEvent)=>{if(!drawing)return;drawing=false;try{canvas.releasePointerCapture?.(e.pointerId)}catch{}if(active&&active.points.length>1)strokes.push(active);active=null;redraw()};canvas.onpointerup=finish;canvas.onpointercancel=finish;
  new ResizeObserver(resize).observe(wrap);new MutationObserver(()=>requestAnimationFrame(resize)).observe(board,{childList:true,subtree:true});new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});document.querySelector('#play')?.addEventListener('click',()=>requestAnimationFrame(()=>{resize();sync();captureLegacyHistory()}));document.querySelector('#edit')?.addEventListener('click',()=>requestAnimationFrame(sync));document.querySelector('#new')?.addEventListener('click',()=>requestAnimationFrame(()=>{strokes.length=0;active=null;enabled=false;timeline.length=0;timelineSeq=0;lastActionCount=0;noteInput.value='';resize();redraw();sync();renderTimeline()}));resize();sync();captureLegacyHistory();
}
