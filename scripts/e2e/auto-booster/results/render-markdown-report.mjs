export function renderMarkdownReport(report) {
  const lines = [
    "# Auto Booster E2E Report",
    "",
    `Generated at: ${report.generatedAt}`,
    `Extension ID: ${report.extensionId}`,
    "",
    "| Scenario | Classification | Passed |",
    "| --- | --- | --- |"
  ];

  for (const result of report.results) {
    lines.push(`| ${result.name} | ${result.classification} | ${result.passed ? "yes" : "no"} |`);
  }

  return `${lines.join("\n")}\n`;
}
