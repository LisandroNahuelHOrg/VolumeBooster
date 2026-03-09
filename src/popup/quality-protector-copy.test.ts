import { QUALITY_PROTECTOR_MODE_ORDER } from "../shared/audio-settings";
import type { AudioQualityProtectorMode } from "../shared/types";
import {
  QUALITY_PROTECTOR_COPY,
  getQualityProtectorButtonCopy,
  getQualityProtectorModeCopy,
  getQualityProtectorSubtitleCopy
} from "./quality-protector-copy";

function buildRows(modes: AudioQualityProtectorMode[]): AudioQualityProtectorMode[][] {
  return modes.reduce<AudioQualityProtectorMode[][]>((rows, mode, index) => {
    if (index === 0) {
      rows.push([mode]);
      return rows;
    }

    const rowIndex = Math.floor((index - 1) / 2) + 1;
    const row = rows[rowIndex] ?? [];
    row.push(mode);
    rows[rowIndex] = row;
    return rows;
  }, []);
}

describe("quality-protector-copy", () => {
  beforeEach(() => {
    const messages: Record<string, string> = {
      qualityProtectorOff: "Off",
      qualityProtectorBalanced: "Balanced",
      qualityProtectorWarmth: "Warmth",
      qualityProtectorBassAware: "Bass-Aware",
      qualityProtectorVocalFocus: "Vocal Focus",
      qualityProtectorClarity: "Clarity",
      qualityProtectorTrebleSafe: "Treble Safe",
      qualityProtectorPunchPreserve: "Punch Preserve",
      qualityProtectorMaximumProtection: "Max Protection",
      qualityProtectorWarmthSubtitle:
        "Keeps body and smoothness in the sound while applying gentler protection to harsh highs.",
      qualityProtectorVocalFocusSubtitle:
        "Pushes speech and lead vocals forward while controlling rumble and muddy low-end.",
      qualityProtectorTrebleSafeSubtitle:
        "Softens edgy highs and sibilance so bright audio stays clear without turning sharp.",
      qualityProtectorPunchPreserveSubtitle:
        "Protects peaks while keeping drums, hits, and transients feeling fast and impactful."
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

  it("keeps the popup rows aligned with the planned 1 + 4x2 protector layout", () => {
    expect(buildRows(QUALITY_PROTECTOR_MODE_ORDER)).toEqual([
      ["off"],
      ["balanced", "warmth"],
      ["bass_aware", "vocal_focus"],
      ["clarity", "treble_safe"],
      ["punch_preserve", "maximum_protection"]
    ]);
  });

  it("resolves the translated labels and subtitles for all new protector modes", () => {
    const catalog = {} as never;

    expect(getQualityProtectorModeCopy("warmth", catalog)).toBe("Warmth");
    expect(getQualityProtectorSubtitleCopy("warmth", catalog)).toBe(
      "Keeps body and smoothness in the sound while applying gentler protection to harsh highs."
    );
    expect(getQualityProtectorModeCopy("vocal_focus", catalog)).toBe("Vocal Focus");
    expect(getQualityProtectorSubtitleCopy("vocal_focus", catalog)).toBe(
      "Pushes speech and lead vocals forward while controlling rumble and muddy low-end."
    );
    expect(getQualityProtectorModeCopy("treble_safe", catalog)).toBe("Treble Safe");
    expect(getQualityProtectorSubtitleCopy("treble_safe", catalog)).toBe(
      "Softens edgy highs and sibilance so bright audio stays clear without turning sharp."
    );
    expect(getQualityProtectorModeCopy("punch_preserve", catalog)).toBe("Punch Preserve");
    expect(getQualityProtectorSubtitleCopy("punch_preserve", catalog)).toBe(
      "Protects peaks while keeping drums, hits, and transients feeling fast and impactful."
    );
    expect(getQualityProtectorModeCopy("maximum_protection", catalog)).toBe("Max Protection");
  });

  it("keeps OFF uppercase in the grid while leaving the rest of the buttons human-readable", () => {
    const catalog = {} as never;

    expect(getQualityProtectorButtonCopy("off", catalog)).toBe("OFF");
    expect(getQualityProtectorButtonCopy("warmth", catalog)).toBe("Warmth");
    expect(getQualityProtectorButtonCopy("maximum_protection", catalog)).toBe("Max Protection");
    expect(QUALITY_PROTECTOR_COPY.maximum_protection.labelKey).toBe("qualityProtectorMaximumProtection");
  });
});
