import { registerUsesDefaultFetchTransportWithoutNativeFetchCase } from "../register/uses-default-fetch-transport-without-native-fetch.register";
import { registerUsesMirroredNativeFetchTransportCase } from "../register/uses-mirrored-native-fetch-transport.register";
import { registerMirrorsTransportEnvelopesWhenSmokeEnabledCase } from "../register/mirrors-transport-envelopes-when-smoke-enabled.register";
import { registerRecordsMirroredFailuresAndKeepsLatestTenCase } from "../register/records-mirrored-failures-and-keeps-latest-ten.register";
import { registerResetsMirroredTransportBufferCase } from "../register/resets-mirrored-transport-buffer.register";
import { registerMirrorsRequestInputsUsingOriginalUrlCase } from "../register/mirrors-request-inputs-using-original-url.register";

export function defineSmokeMirrorSuite(): void {
  registerUsesDefaultFetchTransportWithoutNativeFetchCase();
  registerUsesMirroredNativeFetchTransportCase();
  registerMirrorsTransportEnvelopesWhenSmokeEnabledCase();
  registerRecordsMirroredFailuresAndKeepsLatestTenCase();
  registerResetsMirroredTransportBufferCase();
  registerMirrorsRequestInputsUsingOriginalUrlCase();
}
