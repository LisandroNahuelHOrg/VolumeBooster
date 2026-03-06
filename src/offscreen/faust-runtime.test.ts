describe("faust-runtime", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exposes exact runtime asset paths for every dsp variant", async () => {
    const runtime = await import("./faust-runtime");

    expect(runtime.WORKLET_PATHS).toEqual({
      mono: "assets/faust-mono-worklet.js",
      stereo: "assets/faust-stereo-worklet.js"
    });
    expect(runtime.PROCESSOR_NAMES).toEqual({
      mono: "prism-premium-mono-processor",
      stereo: "prism-premium-stereo-processor"
    });
    expect(runtime.FACTORY_ASSET_PATHS).toEqual({
      mono: {
        wasm: "faust/mono/dsp-module.wasm",
        json: "faust/mono/dsp-meta.json"
      },
      stereo: {
        wasm: "faust/stereo/dsp-module.wasm",
        json: "faust/stereo/dsp-meta.json"
      }
    });
  });
});
