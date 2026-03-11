import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderMarkdownReport } from "./render-markdown-report.mjs";

export async function writeAutoBoosterReportFiles(outputRoot, report) {
  await writeFile(resolve(outputRoot, "auto-booster-report.json"), JSON.stringify(report, null, 2), "utf8");
  await writeFile(resolve(outputRoot, "auto-booster-report.md"), renderMarkdownReport(report), "utf8");
}
