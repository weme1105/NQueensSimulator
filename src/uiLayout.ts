type UiBridge = { isPlayMode(): boolean; getBoard(): { size:number; cells:Array<{row:number;col:number;regionId:number;state:number}> }; installBoard(board:{size:number;cells:Array<{row:number;col:number;regionId:number;state:number}>}):void };

export function installUiLayout(app: UiBridge): void {
  const toolbar=document.querySelector<HTMLElement>('.toolbar');
  const mainPanel=document.querySelector<HTMLElement>('.main .panel');
  const board=document.querySelector<HTMLElement>('#board');
  const palette=document.querySelector<HTMLElement>('#palette');
  const randomBtn=document.querySelector<HTMLButtonElement>('#random');
  const editBtn=document.querySelector<HTMLButtonElement>('#edit');
  const playBtn=document.querySelector<HTMLButtonElement>('#play');
  const undoBtn=document.querySelector<HTMLButtonElement>('#undo');
  const clearBtn=document.querySelector<HTMLButtonElement>('#clear');
  const stepBtn=document.querySelector<HTMLButtonElement>('#stepSolve');
  const autoBtn=document.querySelector<HTMLButtonElement>('#autoQueen');
  const solver=document.querySelector<HTMLElement>('#solver');
  const guide=document.querySelector<HTMLElement>('.play-guide');
  const annotationTools=document.querySelector<HTMLElement>('.annotation-tools');
  const annotationWrap=document.querySelector<HTMLElement>('.annotation-wrap');
  const colorTools=document.querySelector<HTMLElement>('.region-color-tools');
  const mode=document.querySelector<HTMLElement>('#mode');
  const nInput=document.querySelector<HTMLInputElement>('#n');
  if(!toolbar||!mainPanel||!board||!palette||!randomBtn||!editBtn||!playBtn||!undoBtn||!clearBtn||!stepBtn||!autoBtn||!solver||!annotationTools||!colorTools||!nInput)return;

  const style=document.createElement('style'); style.textContent=`
  body.nq-source-ui .toolbar{gap:10px;position:relative;overflow:visible}
  body.nq-source-ui .toolbar #random,body.nq-source-ui .toolbar #edit,body.nq-source-ui .toolbar #undo,body.nq-source-ui .toolbar #clear,body.nq-source-ui .toolbar .stats{display:none!important}
  body.nq-source-ui .toolbar>span:first-child,body.nq-source-ui .toolbar #n{display:none!important}
  body.nq-source-ui #mode{display:none!important}.nq-edit-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 10px}.nq-edit-actions .region-color-tools{margin:0;width:auto}.nq-edit-actions .region-color-panel{width:100%;flex-basis:100%}
  .nq-play-actions{display:none;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0}.nq-play-mode .nq-play-actions{display:flex}.nq-play-mode .nq-edit-actions,.nq-play-mode #palette,.nq-play-mode .region-color-tools,.nq-play-mode .region-legend,.nq-play-mode .play-guide .guide-card:nth-child(2){display:none!important}
  .nq-rule-tip{display:none}.nq-play-mode .nq-rule-tip{display:inline-flex}.nq-play-mode .play-guide:not(.nq-open){display:none!important}.nq-play-mode .play-guide.nq-open{display:grid!important;width:100%;margin-top:0}.nq-play-actions:not(.solver-unlocked) #stepSolve,.nq-play-actions:not(.solver-unlocked) #autoQueen{display:none!important}.nq-play-actions.solver-unlocked #stepSolve,.nq-play-actions.solver-unlocked #autoQueen{display:inline-block!important}
  .nq-play-mode .nq-size-picker,.nq-play-mode .toolbar #new{display:none!important}.nq-play-mode .toolbar #play{margin-right:auto}body:not(.nq-play-mode) .annotation-tools{display:none!important}
  .nq-operation-tip{display:none;margin-left:auto}.nq-play-mode .nq-operation-tip{display:inline-flex}.nq-operation-panel{display:none;position:absolute;right:16px;top:calc(100% + 8px);z-index:120;width:min(390px,calc(100vw - 40px));padding:12px 14px;border:1px solid #eaded8;border-radius:12px;background:#fff;box-shadow:0 10px 28px #0002;line-height:1.65;font-size:13px}.nq-operation-panel.open{display:block}.nq-operation-panel b{display:block;margin-bottom:5px;font-size:14px}
  .nq-size-picker{display:grid;grid-template-columns:32px 52px 32px;grid-template-rows:24px 38px 24px;align-items:center;justify-items:center;column-gap:3px;user-select:none;-webkit-user-select:none;touch-action:none;border:1px solid #eaded8;border-radius:12px;padding:3px 5px;background:#fffaf8;box-shadow:inset 0 0 0 1px #fff}
  .nq-size-prev,.nq-size-next{grid-column:2;font-size:13px;opacity:.45;line-height:1}.nq-size-prev{grid-row:1}.nq-size-next{grid-row:3}.nq-size-current{grid-column:2;grid-row:2;font-size:21px;font-weight:800;line-height:1}.nq-size-minus,.nq-size-plus{grid-row:2;width:30px;height:30px;padding:0;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px}.nq-size-minus{grid-column:1}.nq-size-plus{grid-column:3}.nq-size-picker.dragging{outline:2px solid #c79b9b}.nq-size-picker.at-min .nq-size-prev,.nq-size-picker.at-max .nq-size-next{visibility:hidden}
  button,.cell,#board,#palette,.annotation-canvas{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
  @media(max-width:850px){.nq-edit-actions,.nq-play-actions{gap:6px}.nq-operation-panel{right:8px}.nq-size-picker{grid-template-columns:30px 46px 30px;grid-template-rows:21px 34px 21px;padding:2px 4px}.nq-size-current{font-size:20px}}
  `;
  document.head.append(style); document.body.classList.add('nq-source-ui'); if(mode)mode.hidden=true;

  const newBtn=document.querySelector<HTMLButtonElement>('#new'); if(newBtn)newBtn.textContent='設定棋盤大小'; playBtn.textContent='開始推演'; randomBtn.textContent='產生隨機棋盤'; undoBtn.textContent='上一步'; clearBtn.textContent='清空'; stepBtn.textContent='推演一步'; autoBtn.textContent='推演到下一個皇后';

  const sizePicker=document.createElement('div');sizePicker.className='nq-size-picker';sizePicker.setAttribute('role','group');sizePicker.setAttribute('aria-label','棋盤大小');
  sizePicker.innerHTML='<div class="nq-size-prev"></div><button type="button" class="nq-size-minus" aria-label="減少棋盤大小">−</button><div class="nq-size-current"></div><button type="button" class="nq-size-plus" aria-label="增加棋盤大小">+</button><div class="nq-size-next"></div>';
  toolbar.insertBefore(sizePicker,newBtn??playBtn);
  const prevValue=sizePicker.querySelector<HTMLElement>('.nq-size-prev')!,currentValue=sizePicker.querySelector<HTMLElement>('.nq-size-current')!,nextValue=sizePicker.querySelector<HTMLElement>('.nq-size-next')!,minus=sizePicker.querySelector<HTMLButtonElement>('.nq-size-minus')!,plus=sizePicker.querySelector<HTMLButtonElement>('.nq-size-plus')!;
  const clampSize=(value:number)=>Math.max(4,Math.min(20,Math.round(value)));
  const renderSize=()=>{const value=clampSize(+nInput.value||8);nInput.value=String(value);currentValue.textContent=String(value);prevValue.textContent=String(value-1);nextValue.textContent=String(value+1);sizePicker.classList.toggle('at-min',value<=4);sizePicker.classList.toggle('at-max',value>=20);minus.disabled=value<=4;plus.disabled=value>=20};
  const setSize=(value:number)=>{nInput.value=String(clampSize(value));renderSize()};
  const stepSize=(delta:number)=>setSize((+nInput.value||8)+delta);
  minus.addEventListener('click',e=>{e.preventDefault();stepSize(-1)});plus.addEventListener('click',e=>{e.preventDefault();stepSize(1)});
  sizePicker.addEventListener('wheel',e=>{e.preventDefault();if(Math.abs(e.deltaY)<1)return;stepSize(e.deltaY>0?1:-1)},{passive:false});
  let pickerDragging=false,lastY=0,lastTime=0,velocity=0,carry=0;
  sizePicker.addEventListener('pointerdown',e=>{if((e.target as Element).closest('button'))return;pickerDragging=true;lastY=e.clientY;lastTime=performance.now();velocity=0;carry=0;sizePicker.classList.add('dragging');sizePicker.setPointerCapture?.(e.pointerId);e.preventDefault()});
  sizePicker.addEventListener('pointermove',e=>{if(!pickerDragging)return;e.preventDefault();const now=performance.now(),dy=e.clientY-lastY,dt=Math.max(1,now-lastTime);velocity=dy/dt;carry+=dy;const stepPx=24;while(Math.abs(carry)>=stepPx){const direction=carry<0?1:-1;stepSize(direction);carry+=direction>0?stepPx:-stepPx}lastY=e.clientY;lastTime=now});
  const finishPicker=(e:PointerEvent)=>{if(!pickerDragging)return;pickerDragging=false;sizePicker.classList.remove('dragging');try{sizePicker.releasePointerCapture?.(e.pointerId)}catch{}const speed=Math.abs(velocity);if(speed>.35){const extra=Math.min(6,Math.max(1,Math.round(speed*5)));stepSize(velocity<0?extra:-extra)}carry=0;velocity=0};
  sizePicker.addEventListener('pointerup',finishPicker);sizePicker.addEventListener('pointercancel',finishPicker);nInput.addEventListener('change',renderSize);renderSize();

  const editActions=document.createElement('div');editActions.className='nq-edit-actions';mainPanel.insertBefore(editActions,palette);editActions.append(randomBtn);
  const clearBoard=document.createElement('button');clearBoard.type='button';clearBoard.textContent='清空棋盤';clearBoard.addEventListener('click',()=>{const s=app.getBoard();app.installBoard({size:s.size,cells:s.cells.map(c=>({...c,regionId:-1,state:0}))});});editActions.append(clearBoard);editActions.append(colorTools);const colorToggle=colorTools.querySelector<HTMLButtonElement>('.region-color-toggle');if(colorToggle)colorToggle.textContent='🎨 設定色塊顏色';
  const playActions=document.createElement('div');playActions.className='nq-play-actions';mainPanel.insertBefore(playActions,annotationWrap??board);const tips=document.createElement('button');tips.type='button';tips.className='nq-rule-tip';tips.textContent='💡 規則 Tips';playActions.append(tips,undoBtn,clearBtn,stepBtn,autoBtn);if(guide){playActions.insertAdjacentElement('afterend',guide);guide.classList.remove('nq-open');tips.addEventListener('click',()=>guide.classList.toggle('nq-open'));}
  const opTip=document.createElement('button');opTip.type='button';opTip.className='nq-operation-tip';opTip.textContent='💡 操作 Tips';const opPanel=document.createElement('div');opPanel.className='nq-operation-panel';opPanel.innerHTML='<b>操作說明</b><div>單點空白格：標記 X。</div><div>同一格 1 秒內連點兩下：放置皇后。</div><div>超過 1 秒：X 保留。</div><div>改點其他格：原本 X 保留，新格重新開始判定。</div><div>單點皇后：清空該格。</div><div>拖曳：連續標記或清除 X。</div>';toolbar.append(opTip,opPanel);opTip.addEventListener('click',()=>opPanel.classList.toggle('open'));
  const sync=()=>{const play=app.isPlayMode();document.body.classList.toggle('nq-play-mode',play);playBtn.textContent=play?'離開推演模式':'開始推演';playActions.classList.toggle('solver-unlocked',solver.style.display==='block');if(!play){guide?.classList.remove('nq-open');opPanel.classList.remove('open');renderSize()}};
  playBtn.addEventListener('click',(event)=>{if(!app.isPlayMode())return;event.preventDefault();event.stopImmediatePropagation();const handler=editBtn.onclick;if(typeof handler==='function'){const pointerEvent=new PointerEvent('click',{bubbles:false,cancelable:true,pointerType:'mouse'});handler.call(editBtn,pointerEvent);}requestAnimationFrame(sync);},true);
  new MutationObserver(sync).observe(solver,{attributes:true,attributeFilter:['style']});editBtn.addEventListener('click',()=>requestAnimationFrame(sync));playBtn.addEventListener('click',()=>requestAnimationFrame(sync));newBtn?.addEventListener('click',()=>requestAnimationFrame(()=>{renderSize();sync()}));sync();
}
