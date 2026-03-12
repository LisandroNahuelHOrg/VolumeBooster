export function setText(rootElement: HTMLElement, selector: string, value: string): void {
  const element = rootElement.querySelector<HTMLElement>(selector);

  if (element) {
    element.textContent = value;
  }
}
