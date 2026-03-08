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

    if (isFrameElement(element)) {
      walkFrame(element, visitedRoots, discovered);
    }
  });
}

function isFrameElement(
  element: Element
): element is HTMLIFrameElement | HTMLFrameElement {
  return (
    (typeof HTMLIFrameElement !== "undefined" && element instanceof HTMLIFrameElement) ||
    (typeof HTMLFrameElement !== "undefined" && element instanceof HTMLFrameElement)
  );
}

function walkFrame(
  frame: HTMLIFrameElement | HTMLFrameElement,
  visitedRoots: Set<Document | ShadowRoot>,
  discovered: Set<HTMLMediaElement>
): void {
  const frameDocument = getFrameDocument(frame);

  if (!frameDocument) {
    return;
  }

  walkRoot(frameDocument, visitedRoots, discovered);
}

function getFrameDocument(frame: HTMLIFrameElement | HTMLFrameElement): Document | null {
  try {
    return frame.contentDocument ?? null;
  } catch {
    return null;
  }
}
