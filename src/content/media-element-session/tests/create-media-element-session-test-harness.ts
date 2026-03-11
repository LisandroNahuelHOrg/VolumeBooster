import { selectFaustAsset } from "../../../offscreen/faust-assets";
import {
  defaultFaustAssetDescriptor,
  faustNodeInstances,
  mockFactoryLoader
} from "./faust-node-mock";
import { FakeAudioContext } from "./fake-audio-context";

export function createMediaElementSessionTestHarness() {
  faustNodeInstances.length = 0;
  mockFactoryLoader.mockClear();
  FakeAudioContext.reset();
  vi.clearAllMocks();
  vi.stubGlobal("AudioContext", FakeAudioContext as unknown as typeof AudioContext);
  const chromeGetUrl = vi.fn((value: string) => `chrome-extension://test/${value}`);
  const getAutoplayPolicy = vi.fn(() => "allowed");

  vi.stubGlobal("chrome", { runtime: { getURL: chromeGetUrl } } as unknown as typeof chrome);
  vi.stubGlobal("navigator", {
    getAutoplayPolicy,
    userActivation: { hasBeenActive: true, isActive: true }
  } as unknown as Navigator);
  vi.mocked(selectFaustAsset).mockReset();
  vi.mocked(selectFaustAsset).mockReturnValue(defaultFaustAssetDescriptor as never);
  return { chromeGetUrl, getAutoplayPolicy };
}
