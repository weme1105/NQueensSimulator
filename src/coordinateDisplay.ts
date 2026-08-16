export function installCoordinateDisplayNormalization(): void {
  const targets = [
    document.querySelector<HTMLElement>('#history'),
    document.querySelector<HTMLElement>('#status'),
  ].filter((x): x is HTMLElement => !!x);

  const normalize = (text: string): string => text
    .replace(/R(\d+)C(\d+)/g, '($2,$1)')
    .replace(/C(\d+)R(\d+)/g, '($1,$2)');

  const walk = (root: HTMLElement): void => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const node of nodes) {
      const next = normalize(node.data);
      if (next !== node.data) node.data = next;
    }
  };

  let running = false;
  const refresh = (): void => {
    if (running) return;
    running = true;
    try { for (const target of targets) walk(target); }
    finally { running = false; }
  };

  const observer = new MutationObserver(refresh);
  for (const target of targets) observer.observe(target, { childList: true, subtree: true, characterData: true });
  refresh();
}
