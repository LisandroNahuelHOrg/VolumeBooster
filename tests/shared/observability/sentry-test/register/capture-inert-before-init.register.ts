import { runCaptureInertBeforeInitCase } from "../callback/capture-inert-before-init.callback";

export function registerCaptureInertBeforeInitCase(): void {
  it("keeps capture helpers inert before any runtime context has been initialized", runCaptureInertBeforeInitCase);
}
