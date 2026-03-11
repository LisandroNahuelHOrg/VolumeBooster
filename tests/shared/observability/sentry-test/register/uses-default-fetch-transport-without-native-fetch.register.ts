import { runUsesDefaultFetchTransportWithoutNativeFetchCase } from "../callback/uses-default-fetch-transport-without-native-fetch.callback";

export function registerUsesDefaultFetchTransportWithoutNativeFetchCase(): void {
  it("uses the default fetch transport when smoke mirroring is enabled without a native fetch", runUsesDefaultFetchTransportWithoutNativeFetchCase);
}
