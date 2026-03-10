import { getDomainFromUrl, getDuckDuckGoFaviconUrl } from "../../shared/domain";

export function getPageFaviconUrl(): string | undefined {
  const explicitFavicon =
    document.querySelector<HTMLLinkElement>('link[rel~="icon"][href]')?.href ??
    document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"][href]')?.href;

  if (explicitFavicon) {
    return explicitFavicon;
  }

  return getDuckDuckGoFaviconUrl(getDomainFromUrl(window.location.href));
}
