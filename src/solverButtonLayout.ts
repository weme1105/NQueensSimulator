export function installSolverButtonLayout(): void {
  const solver = document.querySelector<HTMLElement>('#solver');
  const tools = document.querySelector<HTMLElement>('.annotation-tools');
  const clearButton = tools?.querySelector<HTMLButtonElement>('.annotation-clear');
  const stepButton = document.querySelector<HTMLButtonElement>('#stepSolve');
  const autoButton = document.querySelector<HTMLButtonElement>('#autoQueen');
  if (!solver || !tools || !clearButton || !stepButton || !autoButton) return;

  const style = document.createElement('style');
  style.textContent = `
    .annotation-tools:not(.solver-unlocked) #stepSolve,
    .annotation-tools:not(.solver-unlocked) #autoQueen { display:none!important; }
    .annotation-tools.solver-unlocked #stepSolve,
    .annotation-tools.solver-unlocked #autoQueen { display:inline-block!important; margin:0; }
  `;
  document.head.appendChild(style);

  // Final toolbar order:
  // 橡皮擦 → 還原 → 清除 → 推演一步 → 自動推演到下一個皇后
  clearButton.insertAdjacentElement('afterend', stepButton);
  stepButton.insertAdjacentElement('afterend', autoButton);

  const syncUnlockState = (): void => {
    // The legacy UI writes solver.style.display = 'block' only after seven clicks on
    // 「建立空白棋盤」. Keep that exact hidden unlock contract after moving buttons.
    tools.classList.toggle('solver-unlocked', solver.style.display === 'block');
  };

  new MutationObserver(syncUnlockState).observe(solver, {
    attributes: true,
    attributeFilter: ['style'],
  });

  document.querySelector('#new')?.addEventListener('click', () => {
    requestAnimationFrame(syncUnlockState);
  });

  syncUnlockState();
}
