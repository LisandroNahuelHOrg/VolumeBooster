export function resolveDelay(milliseconds: number, resolve: () => void): void {
  setTimeout(resolve, milliseconds);
}
