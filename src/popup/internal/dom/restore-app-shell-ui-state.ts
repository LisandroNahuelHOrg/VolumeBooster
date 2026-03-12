export function restoreAppShellUiState(
  rootElement: HTMLElement,
  doc: Document,
  win: Window,
  scrollTop: number,
  focusedAdvancedKey: string | null
): void {
  const restore = () => {
    const appShell = rootElement.querySelector<HTMLElement>(".app-shell");

    if (appShell) {
      appShell.scrollTop = scrollTop;
    }

    if (!focusedAdvancedKey) {
      return;
    }

    const advancedSlider = rootElement.querySelector<HTMLInputElement>(
      `[data-role='advanced-slider'][data-advanced-key='${focusedAdvancedKey}']`
    );

    if (advancedSlider && doc.activeElement !== advancedSlider) {
      advancedSlider.focus({ preventScroll: true });
    }
  };

  restore();
  win.requestAnimationFrame(restore);
}
