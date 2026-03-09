import { QUALITY_PRESET_ORDER } from "../shared/audio-settings";
import type { QualityPreset } from "../shared/types";
import {
  QUALITY_PRESET_COPY,
  getQualityPresetCopy,
  getQualityPresetSubtitleCopy
} from "./quality-preset-copy";

function buildPresetRows(presets: QualityPreset[]): QualityPreset[][] {
  const rows: QualityPreset[][] = presets.includes("custom") ? [["custom"]] : [];
  const pairedPresets = presets.filter((preset): preset is Exclude<QualityPreset, "custom"> => preset !== "custom");

  return pairedPresets.reduce<QualityPreset[][]>((accumulator, preset, index) => {
    const rowIndex = Math.floor(index / 2) + 1;
    const row = accumulator[rowIndex] ?? [];
    row.push(preset);
    accumulator[rowIndex] = row;
    return accumulator;
  }, rows);
}

describe("quality-preset-copy", () => {
  beforeEach(() => {
    const messages: Record<string, string> = {
      presetBalanced: "Balanced",
      presetBalancedSubtitle:
        "Keeps the overall tone neutral and controlled for everyday listening across music, video, and live streams.",
      presetVocalPresence: "Vocal Presence",
      presetVocalPresenceSubtitle:
        "Brings speech and lead vocals forward so dialogue, podcasts, and streams stay easier to follow.",
      presetMaximumClarity: "Maximum Clarity",
      presetMaximumClaritySubtitle:
        "Prioritizes articulation and separation so vocals, guitars, and detail stay cleaner under boost.",
      presetSmoothBright: "Smooth Bright",
      presetSmoothBrightSubtitle:
        "Keeps top-end detail alive while softening harshness in bright masters, cymbals, and sibilant audio.",
      presetWarmCinematic: "Warm Cinematic",
      presetWarmCinematicSubtitle:
        "Adds body, depth, and smoothness for films, ambient music, and long listening sessions.",
      presetMaximumLoudness: "Maximum Loudness",
      presetMaximumLoudnessSubtitle:
        "Pushes more density and loudness for aggressive playback while still keeping peaks under control.",
      presetBassBoost: "Bass Boost",
      presetBassBoostSubtitle:
        "Adds fuller low-end weight and slam while keeping the rest of the spectrum stable.",
      presetPunchDrive: "Punch Drive",
      presetPunchDriveSubtitle:
        "Increases punch and forward energy so drums, hits, and trailers feel faster and more impactful.",
      presetCustom: "Custom",
      presetCustomSubtitle: "Fine-tune the global premium DSP engine applied to every live booster session."
    };

    vi.stubGlobal("chrome", {
      i18n: {
        getMessage: (key: string) => messages[key] ?? key,
        getUILanguage: () => "en"
      }
    } as unknown as typeof chrome);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the popup rows aligned with the planned custom + 4x2 preset layout", () => {
    expect(buildPresetRows(QUALITY_PRESET_ORDER)).toEqual([
      ["custom"],
      ["balanced", "vocal_presence"],
      ["maximum_clarity", "smooth_bright"],
      ["warm_cinematic", "maximum_loudness"],
      ["bass_boost", "punch_drive"]
    ]);
  });

  it("resolves translated labels and subtitles for the new sound modes", () => {
    const catalog = {} as never;

    expect(getQualityPresetCopy("vocal_presence", catalog)).toBe("Vocal Presence");
    expect(getQualityPresetSubtitleCopy("vocal_presence", catalog)).toBe(
      "Brings speech and lead vocals forward so dialogue, podcasts, and streams stay easier to follow."
    );
    expect(getQualityPresetCopy("smooth_bright", catalog)).toBe("Smooth Bright");
    expect(getQualityPresetSubtitleCopy("smooth_bright", catalog)).toBe(
      "Keeps top-end detail alive while softening harshness in bright masters, cymbals, and sibilant audio."
    );
    expect(getQualityPresetCopy("warm_cinematic", catalog)).toBe("Warm Cinematic");
    expect(getQualityPresetSubtitleCopy("warm_cinematic", catalog)).toBe(
      "Adds body, depth, and smoothness for films, ambient music, and long listening sessions."
    );
    expect(getQualityPresetCopy("punch_drive", catalog)).toBe("Punch Drive");
    expect(getQualityPresetSubtitleCopy("punch_drive", catalog)).toBe(
      "Increases punch and forward energy so drums, hits, and trailers feel faster and more impactful."
    );
  });

  it("keeps custom wired to its dedicated subtitle instead of the old static popup copy", () => {
    const catalog = {} as never;

    expect(getQualityPresetCopy("custom", catalog)).toBe("Custom");
    expect(getQualityPresetSubtitleCopy("custom", catalog)).toBe(
      "Fine-tune the global premium DSP engine applied to every live booster session."
    );
    expect(QUALITY_PRESET_COPY.custom.subtitleKey).toBe("presetCustomSubtitle");
  });
});
