import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { startFixtureServer } from "../../fixture-server.mjs";
import { createCliConfig } from "../cli/create-cli-config.mjs";
import { logStep } from "../logging/log-step.mjs";
import { appendWorkerConsoleMessage } from "../runtime/append-worker-console-message.mjs";
import { createLaunchOptions } from "../runtime/create-launch-options.mjs";
import { ensureGlobalPermission } from "../runtime/ensure-global-permission.mjs";
import { resolveExtensionRuntime } from "../runtime/resolve-extension-runtime.mjs";
import { writeAutoBoosterReportFiles } from "../results/write-auto-booster-report-files.mjs";
import { closeResourceQuietly } from "../shared/close-resource-quietly.mjs";
import { runFixtureScenarios } from "./run-fixture-scenarios.mjs";
import { runPublicSiteScenarios } from "./run-public-site-scenarios.mjs";

export async function runAutoBoosterCli(argv, env, cwd) {
  const config = createCliConfig(argv, env, cwd);
  await mkdir(config.outputRoot, { recursive: true });
  const fixtureServer = config.targets.has("fixtures") || config.targets.has("all") ? await startFixtureServer() : null;
  const workerLogs = [];
  let context;

  try {
    context = await chromium.launchPersistentContext(config.profileDir, createLaunchOptions(config.distDir, env));
    const runtime = await resolveExtensionRuntime(context);
    logStep(`Extension runtime ready: ${runtime.extensionId}`);

    if (runtime.serviceWorker) {
      logStep(`Service worker ready: ${runtime.serviceWorker.url()}`);
      runtime.serviceWorker.on("console", appendWorkerConsoleMessage.bind(null, workerLogs));
    } else {
      logStep("Service worker target was resolved through CDP fallback.");
    }

    const automationPage = await context.newPage();
    await automationPage.goto(`chrome-extension://${runtime.extensionId}/automation.html`, { waitUntil: "domcontentloaded" });
    logStep(`Automation bridge opened: chrome-extension://${runtime.extensionId}/automation.html`);
    await ensureGlobalPermission(automationPage);
    logStep("Global permission confirmed.");
    const results = [];

    if (config.targets.has("fixtures") || config.targets.has("all")) {
      results.push(...(await runFixtureScenarios(context, automationPage, fixtureServer, config.outputRoot, config.scenarioFilter)));
    }

    if (config.targets.has("public-sites") || config.targets.has("all")) {
      results.push(...(await runPublicSiteScenarios(context, automationPage, config.outputRoot, config.siteFilter, config.scenarioFilter)));
    }

    await writeAutoBoosterReportFiles(config.outputRoot, {
      extensionId: runtime.extensionId,
      generatedAt: new Date().toISOString(),
      results,
      workerLogs
    });

    for (const result of results) {
      if (!result.passed) {
        process.exitCode = 1;
        break;
      }
    }
  } finally {
    await closeResourceQuietly(fixtureServer);
    await closeResourceQuietly(context);
  }
}
