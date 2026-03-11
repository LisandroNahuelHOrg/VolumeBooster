import { resolve } from "node:path";

export async function captureScenarioScreenshot(page, outputRoot, name) {
  await page.screenshot({
    fullPage: true,
    path: resolve(outputRoot, `${name}.png`)
  });
}
