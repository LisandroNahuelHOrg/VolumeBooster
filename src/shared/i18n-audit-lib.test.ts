import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// @ts-ignore Test-only import of a local ESM script helper outside the TS program.
import { auditHtmlSource, auditTypeScriptSource, I18N_AUDIT_TARGETS, runI18nLiteralAudit } from "../../scripts/i18n-audit-lib.mjs";

describe("i18n audit lib", () => {
  it("covers content and automation surfaces", () => {
    expect(I18N_AUDIT_TARGETS).toContain("src/content");
    expect(I18N_AUDIT_TARGETS).toContain("src/automation");
  });

  it("flags hardcoded visible text inside HTML template literals", () => {
    const issues = auditTypeScriptSource(
      [
        "const root = document.querySelector('#app');",
        "root.innerHTML = `",
        "  <main>",
        "    <h1>Prism Automation Bridge</h1>",
        "  </main>",
        "`;"
      ].join("\n"),
      "src/automation/main.ts"
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining('contains hardcoded HTML text: "Prism Automation Bridge"')
      ])
    );
  });

  it("flags selected hardcoded attribute copy in HTML sources", () => {
    const issues = auditHtmlSource('<input placeholder="Choose gain" />', "popup.html");

    expect(issues).toEqual(
      expect.arrayContaining([expect.stringContaining('contains hardcoded HTML attribute text: "Choose gain"')])
    );
  });

  it("flags user-facing copy passed through setAttribute on visible attributes", () => {
    const issues = auditTypeScriptSource(
      ['const button = document.createElement("button");', 'button.setAttribute("aria-label", "Choose gain");'].join("\n"),
      "src/popup/main.ts"
    );

    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining('contains hardcoded text: "Choose gain"')]));
  });

  it("allows technical error strings, CSS style values, and viewport metadata", () => {
    const scriptIssues = auditTypeScriptSource(
      [
        'throw new MediaElementSessionError("attach_failed", `AudioContext was not allowed to start. ${reason}`);',
        'Object.assign(root.style, { width: "min(360px, calc(100vw - 24px))", background: "rgba(15, 22, 31, 0.96)" });'
      ].join("\n"),
      "src/content/fallback-toast.ts"
    );
    const htmlIssues = auditHtmlSource(
      '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      "popup.html"
    );

    expect(scriptIssues).toHaveLength(0);
    expect(htmlIssues).toHaveLength(0);
  });

  it("uses i18n_config.json to expand audited surfaces and HTML attributes", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "prism-i18n-audit-"));
    await mkdir(join(repoRoot, "src", "custom"), { recursive: true });
    await writeFile(
      join(repoRoot, "i18n_config.json"),
      JSON.stringify(
        {
          includeGlobs: ["src/custom/**/*.{ts,tsx,js,jsx}"],
          excludeGlobs: [],
          scanExtensions: [".ts"],
          includeHtmlAttributes: ["data-label"]
        },
        null,
        2
      )
    );
    await writeFile(
      join(repoRoot, "src", "custom", "view.ts"),
      ['const html = `', '  <button data-label="Choose gain"></button>', '`;'].join("\n")
    );

    const { issues } = runI18nLiteralAudit(repoRoot);

    expect(issues).toEqual(
      expect.arrayContaining([expect.stringContaining('contains hardcoded HTML attribute text: "Choose gain"')])
    );
  });
});
