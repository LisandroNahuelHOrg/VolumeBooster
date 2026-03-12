export function markBrokenSiteFavicon(target: HTMLImageElement): void {
  const faviconFrame = target.closest<HTMLElement>("[data-role='site-favicon']");

  if (!faviconFrame) {
    return;
  }

  faviconFrame.dataset.broken = "true";
  target.remove();
}
