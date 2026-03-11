/**
 * @fileoverview Binds the automation permission CTA to the bridge action.
 * @module automation/bind-permission-button
 */

import type { WorkerState } from "../shared/types";

/**
 * Binds the request permission button to print the returned state payload.
 */
export function bindPermissionButton(
  root: ParentNode,
  requestPermission: () => Promise<WorkerState | null>
): void {
  const output = root.querySelector<HTMLElement>("[data-role='output']");
  const permissionButton = root.querySelector<HTMLButtonElement>("[data-action='request-global-permission']");

  if (!permissionButton) {
    return;
  }

  permissionButton.addEventListener("click", () => {
    void requestPermission().then((state) => {
      if (output) {
        output.textContent = JSON.stringify(state, null, 2);
      }
    });
  });
}
