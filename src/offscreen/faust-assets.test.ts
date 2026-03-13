const faustAssetsHoisted = vi.hoisted(() => {
  const fakeMeta = {
    name: "prism-premium",
    ui: [
      { shortname: "controls_input_drive_db", address: "/controls/input_drive_db" },
      { shortname: "controls_normalization_enabled", address: "/controls/normalization_enabled" },
      { shortname: "controls_normalization_gain_db", address: "/controls/normalization_gain_db" },
      { shortname: "controls_lookahead_ms", address: "/controls/lookahead_ms" },
      { shortname: "controls_release_ms", address: "/controls/release_ms" },
      { shortname: "controls_multiband_depth", address: "/controls/multiband_depth" },
      { shortname: "controls_protector_enabled", address: "/controls/protector_enabled" },
      { shortname: "controls_output_limiter_enabled", address: "/controls/output_limiter_enabled" },
      { shortname: "controls_low_band_trim_db", address: "/controls/low_band_trim_db" },
      { shortname: "controls_low_band_makeup_db", address: "/controls/low_band_makeup_db" },
      {
        shortname: "controls_low_band_threshold_offset_db",
        address: "/controls/low_band_threshold_offset_db"
      },
      { shortname: "controls_low_band_ratio_bias", address: "/controls/low_band_ratio_bias" },
      {
        shortname: "controls_mid_high_threshold_offset_db",
        address: "/controls/mid_high_threshold_offset_db"
      },
      { shortname: "controls_output_ceiling_db", address: "/controls/output_ceiling_db" },
      { shortname: "controls_output_soft_clip_mix", address: "/controls/output_soft_clip_mix" },
      { shortname: "controls_clarity_presence_tilt_db", address: "/controls/clarity_presence_tilt_db" },
      { shortname: "controls_tone_low_band_gain_db", address: "/controls/tone_low_band_gain_db" },
      { shortname: "controls_tone_mid_band_gain_db", address: "/controls/tone_mid_band_gain_db" }
    ]
  };

  return { fakeMeta };
});

vi.mock("../generated/faust/mono/dsp-meta", () => ({
  default: faustAssetsHoisted.fakeMeta
}));

vi.mock("../generated/faust/stereo/dsp-meta", () => ({
  default: faustAssetsHoisted.fakeMeta
}));

describe("faust-assets", () => {
  const fetchMock = vi.fn();
  const compileMock = vi.fn();
  const getUrlMock = vi.fn((value: string) => `chrome-extension://test/${value}`);

  beforeEach(() => {
    fetchMock.mockReset();
    compileMock.mockReset();
    getUrlMock.mockClear();
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function loadModule() {
    return import("./faust-assets");
  }

  it("selects mono only for explicit single-channel assets", async () => {
    const { MONO_FAUST_ASSET, STEREO_FAUST_ASSET, selectFaustAsset } = await loadModule();

    expect(selectFaustAsset(1)).toBe(MONO_FAUST_ASSET);
    expect(selectFaustAsset(undefined)).toBe(STEREO_FAUST_ASSET);
    expect(selectFaustAsset(2)).toBe(STEREO_FAUST_ASSET);
  });

  it("loads and caches a factory from runtime assets", async () => {
    const { MONO_FAUST_ASSET } = await loadModule();
    const compiledModule = {} as WebAssembly.Module;

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: vi.fn(async () => new Uint8Array([1, 2, 3]).buffer)
      })
      .mockResolvedValueOnce({
        ok: true,
        text: vi.fn(async () => '{"compile_options":"-single"}')
      });
    compileMock.mockResolvedValue(compiledModule);

    const first = await MONO_FAUST_ASSET.loadFactory();
    const second = await MONO_FAUST_ASSET.loadFactory();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(compileMock).toHaveBeenCalledTimes(1);
    expect(getUrlMock).toHaveBeenNthCalledWith(1, "faust/mono/dsp-module.wasm");
    expect(getUrlMock).toHaveBeenNthCalledWith(2, "faust/mono/dsp-meta.json");
    expect(first).toBe(second);
    expect(first.module).toBe(compiledModule);
    expect(first.poly).toBe(false);
    expect(first.json).toBe('{"compile_options":"-single"}');
    expect(first.shaKey).toBe("");
    expect(first.code).toEqual(new Uint8Array([1, 2, 3]));
    expect(first.soundfiles).toEqual({});
  });

  it("marks polyphonic factories when compile options contain wasm-e", async () => {
    const { STEREO_FAUST_ASSET } = await loadModule();

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: vi.fn(async () => new Uint8Array([4, 5]).buffer)
      })
      .mockResolvedValueOnce({
        ok: true,
        text: vi.fn(async () => '{"compile_options":"-single wasm-e"}')
      });
    compileMock.mockResolvedValue({} as WebAssembly.Module);

    const factory = await STEREO_FAUST_ASSET.loadFactory();

    expect(factory.poly).toBe(true);
    expect(getUrlMock).toHaveBeenNthCalledWith(1, "faust/stereo/dsp-module.wasm");
    expect(getUrlMock).toHaveBeenNthCalledWith(2, "faust/stereo/dsp-meta.json");
  });

  it("fails loudly when runtime wasm assets cannot be fetched", async () => {
    const { STEREO_FAUST_ASSET } = await loadModule();

    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        arrayBuffer: vi.fn()
      })
      .mockResolvedValueOnce({
        ok: true,
        text: vi.fn(async () => '{"compile_options":"-single"}')
      });

    await expect(STEREO_FAUST_ASSET.loadFactory()).rejects.toThrow(
      /Faust WASM asset could not be loaded/
    );
  });

  it("fails loudly when runtime metadata assets cannot be fetched", async () => {
    const { MONO_FAUST_ASSET } = await loadModule();

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: vi.fn(async () => new Uint8Array([1]).buffer)
      })
      .mockResolvedValueOnce({
        ok: false,
        text: vi.fn()
      });
    compileMock.mockResolvedValue({} as WebAssembly.Module);

    await expect(MONO_FAUST_ASSET.loadFactory()).rejects.toThrow(
      /Faust metadata asset could not be loaded/
    );
  });

  it("keeps separate factory caches per dsp variant", async () => {
    const { MONO_FAUST_ASSET, STEREO_FAUST_ASSET } = await loadModule();

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: vi.fn(async () => new Uint8Array([1]).buffer)
      })
      .mockResolvedValueOnce({
        ok: true,
        text: vi.fn(async () => '{"compile_options":"-single"}')
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: vi.fn(async () => new Uint8Array([2]).buffer)
      })
      .mockResolvedValueOnce({
        ok: true,
        text: vi.fn(async () => '{"compile_options":"-single wasm-e"}')
      });
    compileMock
      .mockResolvedValueOnce({ mono: true } as unknown as WebAssembly.Module)
      .mockResolvedValueOnce({ stereo: true } as unknown as WebAssembly.Module);

    const monoFactory = await MONO_FAUST_ASSET.loadFactory();
    const stereoFactory = await STEREO_FAUST_ASSET.loadFactory();

    expect(monoFactory).not.toBe(stereoFactory);
    expect(monoFactory.module).toEqual({ mono: true });
    expect(stereoFactory.module).toEqual({ stereo: true });
    expect(stereoFactory.poly).toBe(true);
    expect(compileMock).toHaveBeenCalledTimes(2);
  });

  it("fails loudly when a required control path is missing from the dsp metadata", async () => {
    vi.resetModules();
    vi.doMock("../generated/faust/mono/dsp-meta", () => ({
      default: {
        name: "broken-mono",
        ui: []
      }
    }));
    vi.doMock("../generated/faust/stereo/dsp-meta", () => ({
      default: faustAssetsHoisted.fakeMeta
    }));

    await expect(import("./faust-assets")).rejects.toThrow(/Missing Faust control path "controls_input_drive_db"/);
  });

  it("walks nested metadata groups and ignores controls with incomplete addresses", async () => {
    vi.resetModules();
    vi.doMock("../generated/faust/mono/dsp-meta", () => ({
      default: {
        name: "nested-mono",
        ui: [
          {
            items: [
              { shortname: "controls_input_drive_db", address: "/controls/input_drive_db" },
              { shortname: "controls_normalization_enabled", address: "/controls/normalization_enabled" },
              { shortname: "controls_normalization_gain_db", address: "/controls/normalization_gain_db" },
              { shortname: "controls_lookahead_ms", address: "/controls/lookahead_ms" },
              { shortname: "controls_release_ms", address: "/controls/release_ms" },
              { shortname: "controls_multiband_depth", address: "/controls/multiband_depth" },
              { shortname: "controls_protector_enabled", address: "/controls/protector_enabled" },
              { shortname: "controls_output_limiter_enabled", address: "/controls/output_limiter_enabled" },
              { shortname: "controls_low_band_trim_db", address: "/controls/low_band_trim_db" },
              { shortname: "controls_low_band_makeup_db", address: "/controls/low_band_makeup_db" },
              {
                shortname: "controls_low_band_threshold_offset_db",
                address: "/controls/low_band_threshold_offset_db"
              },
              { shortname: "controls_low_band_ratio_bias", address: "/controls/low_band_ratio_bias" },
              {
                shortname: "controls_mid_high_threshold_offset_db",
                address: "/controls/mid_high_threshold_offset_db"
              },
              { shortname: "controls_output_ceiling_db", address: "/controls/output_ceiling_db" },
              { shortname: "controls_output_soft_clip_mix", address: "/controls/output_soft_clip_mix" },
              { shortname: "controls_clarity_presence_tilt_db", address: "/controls/clarity_presence_tilt_db" },
              { shortname: "controls_toneLow_invalid_only_name" },
              { address: "/controls/tone_mid_missing_name" },
              { shortname: "controls_tone_low_band_gain_db", address: "/controls/tone_low_band_gain_db" },
              { shortname: "controls_tone_mid_band_gain_db", address: "/controls/tone_mid_band_gain_db" }
            ]
          }
        ]
      }
    }));
    vi.doMock("../generated/faust/stereo/dsp-meta", () => ({
      default: faustAssetsHoisted.fakeMeta
    }));

    const { MONO_FAUST_ASSET } = await import("./faust-assets");

    expect(MONO_FAUST_ASSET.controlPaths).toMatchObject({
      inputDriveDb: "/controls/input_drive_db",
      normalizationEnabled: "/controls/normalization_enabled",
      normalizationGainDb: "/controls/normalization_gain_db",
      toneLowBandGainDb: "/controls/tone_low_band_gain_db",
      toneMidBandGainDb: "/controls/tone_mid_band_gain_db"
    });
  });
});
