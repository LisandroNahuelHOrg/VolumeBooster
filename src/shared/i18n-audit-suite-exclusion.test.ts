import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// @ts-ignore Test-only import of a local ESM script helper outside the TS program.
import { runI18nLiteralAudit } from "../../scripts/i18n-audit-lib.mjs";

test("ignores internal .suite.ts coverage files during the i18n literal audit", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "prism-i18n-audit-suite-"));
  await mkdir(join(repoRoot, "src", "content", "feature", "tests"), { recursive: true });
  await writeFile(
    join(repoRoot, "i18n_config.json"),
    JSON.stringify(
      {
        includeGlobs: ["src/content/**/*.{ts,tsx,js,jsx}"],
        excludeGlobs: ["**/*.suite.ts"],
        scanExtensions: [".ts"]
      },
      null,
      2
    )
  );
  await writeFile(
    join(repoRoot, "src", "content", "feature", "tests", "example.suite.ts"),
    ['describe("Example coverage suite", () => {', '  it("contains hardcoded user-facing copy", () => {});', "});"].join("\n")
  );

  const { issues, targetFiles } = runI18nLiteralAudit(repoRoot);

  expect(issues).toHaveLength(0);
  expect(targetFiles).toHaveLength(0);
});
