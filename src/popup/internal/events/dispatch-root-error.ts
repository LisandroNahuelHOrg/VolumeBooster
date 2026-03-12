import { markBrokenSiteFavicon } from "../dom/mark-broken-site-favicon";

export function dispatchRootError(event: Event): void {
  const target = event.target;

  if (target instanceof HTMLImageElement && target.dataset.role === "site-favicon-image") {
    markBrokenSiteFavicon(target);
  }
}
