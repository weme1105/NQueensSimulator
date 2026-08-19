import { UiSession } from './application/ui/UiSession';

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
  const colorTools=document.querySelector<HTMLElement>('.region-color-tools');
  const mode=document.querySelector<HTMLElement>('#mode');
  if(!toolbar||!mainPanel||!board||!palette||!randomBtn||!editBtn||!playBtn||!undoBtn||!clearBtn||!stepBtn||!autoBtn||!solver||!annotationTools||!colorTools)return;

  const ui=new UiSession();
  const style=document.createElement('style'); style.textContent=`
  body.nq-source-ui .toolbar{gap:10px;position:relative;overflow:visible}
  body.nq-source-ui .toolbar #random,body.nq-source-ui .toolbar #edit,body.nq-source-ui .toolbar #undo,body.nq-source-ui .toolbar #clear,body.nq-source-ui .toolbar .stats{display:none!important}
  body.nq-source-ui #mode{display:none!important}.nq-edit-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 10px}.nq-edit-actions .region-color-tools{margin:0;width:auto}.nq-edit-actions .region-color-panel{width:100%;flex-basis:100%}
  .nq-play-actions{display:none;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0}.nq-play-mode .nq-play-actions{display:flex}.nq-play-mode .nq-edit-actions,.nq-play-mode #palette,.nq-play-mode .region-color-tools,.nq-play-mode .region-legend,.nq-play-mode .play-guide .guide-card:nth-child(2){display:none!important}
  .nq-rule-tip{display:none}.nq-play-mode .nq-rule-tip{display:inline-flex}.nq-play-mode .play-guide:not(.nq-open){display:none!important}.nq-play-mode .play-guide.nq-open{display:grid!important;width:100%;margin-top:0}.nq-play-actions:not(.solver-unlocked) #stepSolve,.nq-play-actions:not(.solver-unlocked) #autoQueen{display:none!important}.nq-play-actions.solver-unlocked #stepSolve,.nq-play-actions.solver-unlocked #autoQueen{display:inline-block!important}
  .nq-play-mode .toolbar>span:first-child,.nq-play-mode .toolbar #n,.nq-play-mode .toolbar #new{display:none!important}.nq-play-mode .toolbar #play{margin-right:auto}body:not(.nq-play-mode) .annotation-tools{display:none!important}
  .nq-operation-tip{display:none;margin-left:auto}.nq-play-mode .nq-operation-tip{display:inline-flex}.nq-operation-panel{display:none;position:absolute;right:16px;top:calc(100% + 8px);z-index:120;width:min(390px,calc(100vw - 40px));padding:12px 14px;border:1px solid #eaded8;border-radius:12px;background:#fff;box-shadow:0 10px 28px #0002;line-height:1.65;font-size:13px}.nq-operation-panel.open{display:block}.nq-operation-panel b{display:block;margin-bottom:5px;font-size:14px}
  @media(max-width:850px){.nq-edit-actions,.nq-play-actions{gap:6px}.nq-operation-panel{right:8px}}`;
  document.head.append(style); document.body.classList.add('nq-source-ui'); if(mode)mode.hidden=true;

  const newBtn=document.querySelector<HTMLButtonElement>('#new'); if(newBtn)newBtn.textContent='設定棋盤大小'; playBtn.textContent='開始推演'; randomBtn.textContent='產生隨機棋盤'; undoBtn.textContent='上一步'; clearBtn.textContent='清空'; stepBtn.textContent='推演一步'; autoBtn.textContent='推演到下一個皇后';
  const editActions=document.createElement('div');editActions.className='nq-edit-actions';mainPanel.insertBefore(editActions,palette);editActions.append(randomBtn);
  const clearBoard=document.createElement('button');clearBoard.type='button';clearBoard.textContent='清空棋盤';clearBoard.addEventListener('click',()=>{const s=app.getBoard();app.installBoard({size:s.size,cells:s.cells.map(c=>({...c,regionId:-1,state:0}))});});editActions.append(clearBoard);editActions.append(colorTools);const colorToggle=colorTools.querySelector<HTMLButtonElement>('.region-color-toggle');if(colorToggle)colorToggle.textContent='🎨 設定色塊顏色';
  const playActions=document.createElement('div');playActions.className='nq-play-actions';annotationTools.insertAdjacentElement('afterend',playActions);const tips=document.createElement('button');tips.type='button';tips.className='nq-rule-tip';tips.textContent='💡 規則 Tips';playActions.append(tips,undoBtn,clearBtn,stepBtn,autoBtn);if(guide){playActions.insertAdjacentElement('afterend',guide);guide.classList.remove('nq-open');}
  const opTip=document.createElement('button');opTip.type='button';opTip.className='nq-operation-tip';opTip.textContent='💡 操作 Tips';const opPanel=document.createElement('div');opPanel.className='nq-operation-panel';opPanel.innerHTML='<b>操作說明</b><div>單點空白格：標記 X。</div><div>同一格 1 秒內連點兩下：放置皇后。</div><div>超過 1 秒：X 保留。</div><div>改點其他格：原本 X 保留，新格重新開始判定。</div><div>單點皇后：清空該格。</div><div>拖曳：連續標記或清除 X。</div>';toolbar.append(opTip,opPanel);

  const render=()=>{const state=ui.snapshot();document.body.classList.toggle('nq-play-mode',state.playMode);playBtn.textContent=state.playMode?'離開推演模式':'開始推演';playActions.classList.toggle('solver-unlocked',state.solverUnlocked);guide?.classList.toggle('nq-open',state.ruleGuideOpen);opPanel.classList.toggle('open',state.operationTipsOpen)};
  const sync=()=>{ui.setPlayMode(app.isPlayMode());ui.setSolverUnlocked(solver.style.display==='block');render()};

  tips.addEventListener('click',()=>{ui.toggleRuleGuide();render()});
  opTip.addEventListener('click',()=>{ui.toggleOperationTips();render()});
  playBtn.addEventListener('click',(event)=>{if(!app.isPlayMode())return;event.preventDefault();event.stopImmediatePropagation();const handler=editBtn.onclick;if(typeof handler==='function'){const pointerEvent=new PointerEvent('click',{bubbles:false,cancelable:true,pointerType:'mouse'});handler.call(editBtn,pointerEvent);}requestAnimationFrame(sync);},true);
  new MutationObserver(sync).observe(solver,{attributes:true,attributeFilter:['style']});editBtn.addEventListener('click',()=>requestAnimationFrame(sync));playBtn.addEventListener('click',()=>requestAnimationFrame(sync));newBtn?.addEventListener('click',()=>requestAnimationFrame(sync));sync();
}
