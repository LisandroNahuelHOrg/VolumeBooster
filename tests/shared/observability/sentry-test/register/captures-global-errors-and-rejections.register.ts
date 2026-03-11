import { runCapturesGlobalErrorsAndRejectionsCase } from "../callback/captures-global-errors-and-rejections.callback";

export function registerCapturesGlobalErrorsAndRejectionsCase(): void {
  it("captures uncaught global errors and unhandled rejections via explicit MV3 listeners", runCapturesGlobalErrorsAndRejectionsCase);
}
