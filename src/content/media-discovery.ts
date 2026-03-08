/**
 * @fileoverview Utilities for discovering playable media elements across the
 * document tree and all accessible open shadow roots.
 */

/**
 * Recursively collects every accessible `audio` and `video` element from the
 * current document and any open shadow roots.
 */
export function discoverMediaElements(root: Document | ShadowRoot = document): HTMLMediaElement[] {
  const discovered = new Set<HTMLMediaElement>();
  const visitedRoots = new Set<Document | ShadowRoot>();

  walkRoot(root, visitedRoots, discovered);

  return [...discovered];
}

function walkRoot(
  root: Document | ShadowRoot,
  visitedRoots: Set<Document | ShadowRoot>,
  discovered: Set<HTMLMediaElement>
): void {
  if (visitedRoots.has(root)) {
    return;
  }

  visitedRoots.add(root);
  root.querySelectorAll<HTMLMediaElement>("audio, video").forEach((element) => {
    discovered.add(element);
  });

  root.querySelectorAll<HTMLElement>("*").forEach((element) => {
    if (element.shadowRoot) {
      walkRoot(element.shadowRoot, visitedRoots, discovered);
    }
  });
}
