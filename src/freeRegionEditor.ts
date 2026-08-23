import { installPlayPointerGuard } from './playPointerGuard';
import { canAssignRegion, nextTappedRegionId } from './regionEditRules';
import type { BoardSnapshot } from './solver/types';

type RegionEditorBridge = {
  getBoard(): BoardSnapshot;
  getSize(): number;
  isPlayMode(): boolean;
  installBoard(board: BoardSnapshot): void;
};

type CellPosition = { row: number; col: number };

export function installFreeRegionEditor(app: RegionEditorBridge): void {
  installPlayPointerGuard(app);

  const board=document.querySelector<HTMLElement>('#board');
  const palette=document.querySelector<HTMLElement>('#palette');
  if(!board||!palette) return;

  let selectedRegion=0,dragging=false,moved=false,start:CellPosition|null=null;
  let visited=new Set<string>();
  let working:BoardSnapshot|null=null;
  const keyOf=(row:number,col:number):string=>`${row},${col}`;
  const hitCell=(clientX:number,clientY:number):CellPosition|null=>{
    const element=document.elementFromPoint(clientX,clientY);
    const cell=element?.closest<HTMLElement>('.cell');
    if(!cell||!board.contains(cell)) return null;
    return{row:Number(cell.dataset.row),col:Number(cell.dataset.col)};
  };
  const syncPaletteSelection=():void=>{
    const buttons=Array.from(palette.querySelectorAll<HTMLElement>('.colorBtn'));
    buttons.forEach((button,index)=>{
      const expected=selectedRegion<0?index===app.getSize():index===selectedRegion;
      button.classList.toggle('selected',expected);
    });
  };
  const installWorkingBoard=():void=>{
    if(!working)return;
    app.installBoard(working);
    requestAnimationFrame(syncPaletteSelection);
  };
  const assign=(position:CellPosition,regionId:number,allowOverwrite=false):void=>{
    if(!working)return;
    const cell=working.cells.find(item=>item.row===position.row&&item.col===position.col);
    if(!cell||!canAssignRegion(cell.regionId,regionId,allowOverwrite))return;
    cell.regionId=regionId;
    installWorkingBoard();
  };

  palette.addEventListener('pointerdown',event=>{
    if(app.isPlayMode())return;
    const button=(event.target as Element|null)?.closest<HTMLElement>('.colorBtn');
    if(!button||!palette.contains(button))return;
    const buttons=Array.from(palette.querySelectorAll<HTMLElement>('.colorBtn'));
    const index=buttons.indexOf(button);
    if(index<0)return;
    selectedRegion=index>=app.getSize()?-1:index;
    requestAnimationFrame(syncPaletteSelection);
  },true);

  board.addEventListener('pointerdown',event=>{
    if(app.isPlayMode())return;
    if(event.pointerType==='mouse'&&event.button!==0)return;
    const hit=hitCell(event.clientX,event.clientY);
    if(!hit)return;
    event.preventDefault();event.stopImmediatePropagation();
    dragging=true;moved=false;start=hit;visited=new Set<string>();working=app.getBoard();
    board.setPointerCapture?.(event.pointerId);
    if(selectedRegion<0){visited.add(keyOf(hit.row,hit.col));assign(hit,-1);}
  },true);

  board.addEventListener('pointermove',event=>{
    if(!dragging||app.isPlayMode())return;
    event.preventDefault();event.stopImmediatePropagation();
    const hit=hitCell(event.clientX,event.clientY);
    if(!hit||!start)return;
    if(hit.row!==start.row||hit.col!==start.col)moved=true;
    if(!moved&&selectedRegion>=0)return;
    if(selectedRegion>=0&&visited.size===0){visited.add(keyOf(start.row,start.col));assign(start,selectedRegion);}
    const key=keyOf(hit.row,hit.col);
    if(visited.has(key))return;
    visited.add(key);assign(hit,selectedRegion);
  },true);

  const finish=(event:PointerEvent):void=>{
    if(!dragging||app.isPlayMode())return;
    event.preventDefault();event.stopImmediatePropagation();
    try{board.releasePointerCapture?.(event.pointerId);}catch{/* ignore */}
    if(start&&!moved&&selectedRegion>=0){
      working??=app.getBoard();
      const cell=working.cells.find(item=>item.row===start!.row&&item.col===start!.col);
      if(cell)assign(start,nextTappedRegionId(cell.regionId,selectedRegion),true);
    }
    dragging=false;moved=false;start=null;visited.clear();working=null;
  };

  board.addEventListener('pointerup',finish,true);
  board.addEventListener('pointercancel',event=>{
    if(!dragging||app.isPlayMode())return;
    event.preventDefault();event.stopImmediatePropagation();
    dragging=false;moved=false;start=null;visited.clear();working=null;
  },true);
  document.querySelector('#new')?.addEventListener('click',()=>{selectedRegion=0;requestAnimationFrame(syncPaletteSelection);});
  document.querySelector('#edit')?.addEventListener('click',()=>requestAnimationFrame(syncPaletteSelection));
  requestAnimationFrame(syncPaletteSelection);
}
