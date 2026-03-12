export function ensureFloatingHelpTooltip(documentRef: Document): HTMLElement {
  let tooltip = documentRef.querySelector<HTMLElement>(".floating-help-tooltip");

  if (tooltip) {
    return tooltip;
  }

  tooltip = documentRef.createElement("div");
  tooltip.className = "floating-help-tooltip";
  tooltip.id = "floating-help-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.dataset.visible = "false";
  documentRef.body.appendChild(tooltip);
  return tooltip;
}
