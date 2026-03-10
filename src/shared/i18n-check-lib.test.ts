import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// @ts-ignore Test-only import of a local ESM script helper outside the TS program.
import { isGenericEnglishDescription, runI18nCheck } from "../../scripts/i18n-check-lib.mjs";

describe("i18n check lib", () => {
  it("rejects boilerplate English descriptions", () => {
    expect(isGenericEnglishDescription("Localized UI copy for activateBooster.")).toBe(true);
    expect(
      isGenericEnglishDescription("Primary button shown on the automation bridge page to recover all-sites host access.")
    ).toBe(false);
  });

  it("rejects untranslated copies that are not allowlisted", async () => {
    const repoRoot = await createTempRepo({
      en: {
        extName: withDescription("Prism Volume Booster", "Brand name shown in Chrome."),
        boostLabel: withDescription("Boost", "Compact label shown next to the main gain meter in the popup.")
      },
      es: {
        extName: { message: "Prism Volume Booster" },
        boostLabel: { message: "Boost" }
      },
      allowlist: ["extName"]
    });

    const { issues } = runI18nCheck(repoRoot);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("[es] boostLabel still matches the canonical English message and is not allowlisted.")
      ])
    );
    expect(issues.some((issue: string) => issue.includes("extName still matches"))).toBe(false);
  });

  it("rejects generic descriptions in the canonical English catalog", async () => {
    const repoRoot = await createTempRepo({
      en: {
        boostLabel: withDescription("Boost", "Label text for boostLabel.")
      },
      es: {
        boostLabel: { message: "Impulso" }
      },
      allowlist: []
    });

    const { issues } = runI18nCheck(repoRoot);

    expect(issues).toEqual(
      expect.arrayContaining([expect.stringContaining("[en] boostLabel must have a contextual description in en.")])
    );
  });

  it("reads localeDirectories from i18n_config.json", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "prism-i18n-check-config-"));
    const localesRoot = join(repoRoot, "custom-locales");
    await mkdir(join(localesRoot, "en"), { recursive: true });
    await mkdir(join(localesRoot, "es"), { recursive: true });
    await mkdir(join(repoRoot, "scripts"), { recursive: true });
    await writeFile(
      join(repoRoot, "i18n_config.json"),
      JSON.stringify({ localeDirectories: ["custom-locales"] }, null, 2)
    );
    await writeFile(
      join(localesRoot, "en", "messages.json"),
      JSON.stringify({ boostLabel: withDescription("Boost", "Compact label shown next to the main gain meter in the popup.") }, null, 2)
    );
    await writeFile(join(localesRoot, "es", "messages.json"), JSON.stringify({ boostLabel: { message: "Impulso" } }, null, 2));
    await writeFile(
      join(repoRoot, "scripts", "i18n-identical-allowlist.json"),
      JSON.stringify({ identicalMessageKeys: [] }, null, 2)
    );

    const { issues, localeDirs } = runI18nCheck(repoRoot);

    expect(issues).toEqual([]);
    expect(localeDirs).toEqual(["en", "es"]);
  });

  it("falls back to default localeDirectories when the config provides an empty array", async () => {
    const repoRoot = await createTempRepo({
      en: {
        boostLabel: withDescription("Boost", "Compact label shown next to the main gain meter in the popup.")
      },
      es: {
        boostLabel: { message: "Impulso" }
      },
      allowlist: []
    });
    await writeFile(join(repoRoot, "i18n_config.json"), JSON.stringify({ localeDirectories: [] }, null, 2));

    const { issues, localeDirs } = runI18nCheck(repoRoot);

    expect(issues).toEqual([]);
    expect(localeDirs).toEqual(["en", "es"]);
  });

  it("validates every configured locale root, not only the first one", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "prism-i18n-check-multi-root-"));
    const rootA = join(repoRoot, "custom-locales-a");
    const rootB = join(repoRoot, "custom-locales-b");
    await mkdir(join(rootA, "en"), { recursive: true });
    await mkdir(join(rootA, "es"), { recursive: true });
    await mkdir(join(rootB, "en"), { recursive: true });
    await mkdir(join(rootB, "es"), { recursive: true });
    await mkdir(join(repoRoot, "scripts"), { recursive: true });
    await writeFile(
      join(repoRoot, "i18n_config.json"),
      JSON.stringify({ localeDirectories: ["custom-locales-a", "custom-locales-b"] }, null, 2)
    );
    await writeFile(
      join(rootA, "en", "messages.json"),
      JSON.stringify({ boostLabel: withDescription("Boost", "Compact label shown next to the main gain meter in the popup.") }, null, 2)
    );
    await writeFile(join(rootA, "es", "messages.json"), JSON.stringify({ boostLabel: { message: "Impulso" } }, null, 2));
    await writeFile(
      join(rootB, "en", "messages.json"),
      JSON.stringify({ boostLabel: withDescription("Boost", "Compact label shown next to the main gain meter in the popup.") }, null, 2)
    );
    await writeFile(join(rootB, "es", "messages.json"), JSON.stringify({ boostLabel: { message: "Boost" } }, null, 2));
    await writeFile(
      join(repoRoot, "scripts", "i18n-identical-allowlist.json"),
      JSON.stringify({ identicalMessageKeys: [] }, null, 2)
    );

    const { issues } = runI18nCheck(repoRoot);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("[custom-locales-b:es] boostLabel still matches the canonical English message and is not allowlisted.")
      ])
    );
  });
});

function withDescription(message: string, description: string) {
  return { message, description };
}

async function createTempRepo({
  en,
  es,
  allowlist
}: {
  en: Record<string, { message: string; description: string }>;
  es: Record<string, { message: string }>;
  allowlist: string[];
}) {
  const repoRoot = await mkdtemp(join(tmpdir(), "prism-i18n-check-"));
  const localesRoot = join(repoRoot, "public", "_locales");
  await mkdir(join(localesRoot, "en"), { recursive: true });
  await mkdir(join(localesRoot, "es"), { recursive: true });
  await mkdir(join(repoRoot, "scripts"), { recursive: true });

  await writeFile(join(localesRoot, "en", "messages.json"), JSON.stringify(en, null, 2));
  await writeFile(join(localesRoot, "es", "messages.json"), JSON.stringify(es, null, 2));
  await writeFile(
    join(repoRoot, "scripts", "i18n-identical-allowlist.json"),
    JSON.stringify({ identicalMessageKeys: allowlist }, null, 2)
  );

  return repoRoot;
}
