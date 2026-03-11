import { runSwallowsSdkFailuresCase } from "../callback/swallows-sdk-failures.callback";

export function registerSwallowsSdkFailuresCase(): void {
  it("swallows SDK failures from init and capture helpers", runSwallowsSdkFailuresCase);
}
