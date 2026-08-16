from pathlib import Path

path = Path('index.html')
source = path.read_text(encoding='utf-8')
old_live = "function liveCheck(){const empty=cells.flat().filter(c=>c.regionId<0).length;if(empty){setStatus('色塊設定中：還有 '+empty+' 格尚未分配顏色。');return}const p=puzzleStatus();setStatus((p.type==='unique'?'✓ ':p.type==='multiple'?'△ ':'✗ ')+p.msg,p.type==='unique'?'ok':p.type==='multiple'?'warn':'bad')}"
new_live = "function liveCheck(){const empty=cells.flat().filter(c=>c.regionId<0).length;if(empty){setStatus('色塊設定中：還有 '+empty+' 格尚未分配顏色。');return}setStatus('正在背景檢查解的數量…','info');window.dispatchEvent(new CustomEvent('nq:validate'))}"
if old_live in source:
    source = source.replace(old_live, new_live, 1)

old_bridge = """  getBoard:()=>({size:N,cells:cells.flat().map(c=>({row:c.row,col:c.col,regionId:c.regionId,state:c.state}))}),
  isPlayMode:()=>mode==='play',
  validateRegions:()=>validateRegions(),
  activatePlay:(solutionType)=>{mode='play';buildPlayGeometry();render();setStatus(solutionType==='unique'?'題目驗證通過：唯一解。':'題目可解，但存在多組解。',solutionType==='unique'?'ok':'warn')},
  applyDeduction:"""
new_bridge = """  getBoard:()=>({size:N,cells:cells.flat().map(c=>({row:c.row,col:c.col,regionId:c.regionId,state:c.state}))}),
  getSize:()=>Math.max(4,Math.min(20,+$('n').value||8)),
  isPlayMode:()=>mode==='play',
  validateRegions:()=>validateRegions(),
  activatePlay:(solutionType)=>{mode='play';buildPlayGeometry();render();setStatus(solutionType==='unique'?'題目驗證通過：唯一解。':'題目可解，但存在多組解。',solutionType==='unique'?'ok':'warn')},
  installBoard:(board)=>{N=board.size;$('n').value=N;cells=Array.from({length:N},(_,r)=>Array.from({length:N},(_,c)=>{const x=board.cells.find(v=>v.row===r&&v.col===c);return{row:r,col:c,regionId:x?x.regionId:-1,state:0,conflict:false}}));playGeometry=null;hist=[];opCount=0;selected=0;mode='edit';touchRegions(cells);render()},
  applyDeduction:"""
if old_bridge in source:
    source = source.replace(old_bridge, new_bridge, 1)

path.write_text(source, encoding='utf-8')
