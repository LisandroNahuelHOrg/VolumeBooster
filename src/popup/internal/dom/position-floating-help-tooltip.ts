import { clampNumber } from "../util/clamp-number";
import { ensureFloatingHelpTooltip } from "./ensure-floating-help-tooltip";

export function positionFloatingHelpTooltip(helpWrap: HTMLElement, documentRef: Document): void {
  const tooltip = ensureFloatingHelpTooltip(documentRef);
  const tooltipContent = helpWrap.querySelector<HTMLElement>(".telemetry-pill__tooltip")?.textContent?.trim();

  if (!tooltipContent) {
    tooltip.dataset.visible = "false";
    return;
  }

  tooltip.textContent = tooltipContent;
  tooltip.dataset.visible = "true";

  const wrapRect = helpWrap.getBoundingClientRect();
  const viewportWidth = documentRef.documentElement.clientWidth || window.innerWidth;
  const viewportHeight = window.innerHeight || documentRef.documentElement.clientHeight;
  const viewportPadding = 12;
  const gap = 10;
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;

  let side: "top" | "bottom" = "top";
  let top = wrapRect.top - tooltipHeight - gap;

  if (top < viewportPadding) {
    side = "bottom";
    top = wrapRect.bottom + gap;
  }

  top = clampNumber(top, viewportPadding, Math.max(viewportPadding, viewportHeight - tooltipHeight - viewportPadding));

  const idealLeft = wrapRect.right - tooltipWidth;
  const left = clampNumber(
    idealLeft,
    viewportPadding,
    Math.max(viewportPadding, viewportWidth - tooltipWidth - viewportPadding)
  );
  const arrowLeft = clampNumber(wrapRect.left + wrapRect.width / 2 - left, 14, Math.max(14, tooltipWidth - 14));

  helpWrap.dataset.tooltipSide = side;
  tooltip.dataset.side = side;
  tooltip.style.setProperty("--tooltip-left", `${left}px`);
  tooltip.style.setProperty("--tooltip-top", `${top}px`);
  tooltip.style.setProperty("--tooltip-hidden-y", side === "top" ? "4px" : "-4px");
  tooltip.style.setProperty("--tooltip-arrow-left", `${arrowLeft}px`);
}
