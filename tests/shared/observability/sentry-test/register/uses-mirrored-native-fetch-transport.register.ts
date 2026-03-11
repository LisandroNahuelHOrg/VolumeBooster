import { runUsesMirroredNativeFetchTransportCase } from "../callback/uses-mirrored-native-fetch-transport.callback";

export function registerUsesMirroredNativeFetchTransportCase(): void {
  it("uses a mirrored native fetch transport when smoke mirroring is enabled and fetch exists", runUsesMirroredNativeFetchTransportCase);
}
