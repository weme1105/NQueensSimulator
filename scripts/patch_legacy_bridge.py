from pathlib import Path

path = Path('index.html')
source = path.read_text(encoding='utf-8')
marker = "$('stepSolve').onclick=solveOneStep;$('autoQueen').onclick=autoUntilNextQueen;build()})();</script></body></html>"
replacement = """$('stepSolve').onclick=solveOneStep;$('autoQueen').onclick=autoUntilNextQueen;
window.nqApp={
  getBoard:()=>({size:N,cells:cells.flat().map(c=>({row:c.row,col:c.col,regionId:c.regionId,state:c.state}))}),
  isPlayMode:()=>mode==='play',
  applyDeduction:(result,source)=>{pushAction((source==='auto'?'自動推演：':'推演：')+result.label,result.changes,'logic');render();setStatus(result.label,'info')},
  showStatus:(message,kind='info')=>setStatus(message,kind),
  setSolverBusy:(busy)=>{const a=$('stepSolve'),b=$('autoQueen');if(a)a.disabled=busy;if(b)b.disabled=busy}
};
build()})();</script><script type="module" src="/src/main.ts"></script></body></html>"""

if 'window.nqApp={' in source:
    print('bridge already installed')
elif marker not in source:
    raise SystemExit('target tail marker not found')
else:
    path.write_text(source.replace(marker, replacement, 1), encoding='utf-8')
    print('bridge installed')
