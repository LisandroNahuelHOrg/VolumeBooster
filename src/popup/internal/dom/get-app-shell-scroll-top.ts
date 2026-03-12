export function getAppShellScrollTop(rootElement: HTMLElement): number {
  return rootElement.querySelector<HTMLElement>(".app-shell")?.scrollTop ?? 0;
}
