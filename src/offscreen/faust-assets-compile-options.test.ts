import { expect, it, vi } from "vitest";

it("treats missing compile options as an empty string and keeps poly disabled", async () => {
  const fetchMock = vi.fn();
  const compileMock = vi.fn().mockResolvedValue({} as WebAssembly.Module);
  const getUrlMock = vi.fn()
    .mockReturnValueOnce("chrome-extension://test/faust/mono/dsp-module.wasm")
    .mockReturnValueOnce("chrome-extension://test/faust/mono/dsp-meta.json");
  const arrayBufferMock = vi.fn().mockResolvedValue(new Uint8Array([1]).buffer);
  const textMock = vi.fn().mockResolvedValue("{}");

  fetchMock
    .mockResolvedValueOnce({
      ok: true,
      arrayBuffer: arrayBufferMock
    })
    .mockResolvedValueOnce({
      ok: true,
      text: textMock
    });
  vi.resetModules();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "chrome",
    {
      runtime: {
        getURL: getUrlMock
      }
    } as unknown as typeof chrome
  );
  vi.stubGlobal("WebAssembly", {
    compile: compileMock
  } as unknown as typeof WebAssembly);

  try {
    const { MONO_FAUST_ASSET } = await import("./faust-assets");
    const factory = await MONO_FAUST_ASSET.loadFactory();

    expect(factory.poly).toBe(false);
    expect(factory.json).toBe("{}");
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
