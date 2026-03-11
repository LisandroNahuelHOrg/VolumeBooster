import {
  defaultFaustAssetDescriptor,
  TestFaustMonoAudioWorkletNode
} from "./media-element-session/tests/faust-node-mock";

vi.mock("@grame/faustwasm", () => ({
  FaustMonoAudioWorkletNode: TestFaustMonoAudioWorkletNode
}));

vi.mock("../offscreen/faust-assets", () => ({
  selectFaustAsset: vi.fn(() => defaultFaustAssetDescriptor)
}));

import { registerAttachEligibilityTests } from "./media-element-session/tests/attach-eligibility.suite";
import { registerAutoplayAndCreationTests } from "./media-element-session/tests/autoplay-and-creation.suite";
import { registerLifecycleAndWorkletTests } from "./media-element-session/tests/lifecycle-and-worklet.suite";
import { registerPresetAndProtectorMappingTests } from "./media-element-session/tests/preset-and-protector-mapping.suite";
import { registerRuntimeAndTelemetryTests } from "./media-element-session/tests/runtime-and-telemetry.suite";

registerAutoplayAndCreationTests();
registerRuntimeAndTelemetryTests();
registerPresetAndProtectorMappingTests();
registerLifecycleAndWorkletTests();
registerAttachEligibilityTests();
