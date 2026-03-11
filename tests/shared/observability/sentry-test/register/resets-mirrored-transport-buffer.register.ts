import { runResetsMirroredTransportBufferCase } from "../callback/resets-mirrored-transport-buffer.callback";

export function registerResetsMirroredTransportBufferCase(): void {
  it("resets the mirrored transport buffer back to an empty list", runResetsMirroredTransportBufferCase);
}
