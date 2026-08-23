export function installSecretUnlock(): void {
  const solver = document.querySelector<HTMLElement>('#solver');
  const operationTip = document.querySelector<HTMLButtonElement>('.nq-operation-tip');
  const newButton = document.querySelector<HTMLButtonElement>('#new');
  const editButton = document.querySelector<HTMLButtonElement>('#edit');
  if (!solver || !operationTip) return;

  let taps = 0;
  let lastTapAt = 0;

  operationTip.addEventListener('click', () => {
    const now = Date.now();
    if (now - lastTapAt > 3000) taps = 0;
    lastTapAt = now;
    taps++;
    if (taps >= 7) {
      taps = 0;
      solver.style.display = 'block';
    }
  });

  // Legacy HTML used seven clicks on #new as the hidden unlock sequence.
  // Reset that legacy counter after every normal new-board action so the old
  // gesture can no longer accumulate to seven clicks.
  newButton?.addEventListener('click', () => {
    requestAnimationFrame(() => {
      if (!editButton || typeof editButton.onclick !== 'function') return;
      const event = new PointerEvent('click', {
        bubbles: false,
        cancelable: true,
        pointerType: 'mouse',
      });
      editButton.onclick.call(editButton, event);
    });
  });
}
