import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { chromium } from "playwright";
import { startFixtureServer } from "./fixture-server.mjs";

const OUTPUT_ROOT = resolve(process.cwd(), "output/playwright");
const PROFILE_DIR = process.env.PRISM_E2E_PROFILE_DIR
  ? resolve(process.cwd(), process.env.PRISM_E2E_PROFILE_DIR)
  : resolve(OUTPUT_ROOT, "profile");
const DIST_DIR = resolve(process.cwd(), "dist");
const TARGETS = parseTargets(process.argv);
const SITE_SET = new Set(parseSiteFilter(process.argv));
const SCENARIO_SET = new Set(parseScenarioFilter(process.argv));

await mkdir(OUTPUT_ROOT, { recursive: true });

const fixtureServer = TARGETS.has("fixtures") || TARGETS.has("all") ? await startFixtureServer() : null;
const workerLogs = [];
let context;

try {
  const launchOptions = {
    headless: process.env.PRISM_E2E_HEADLESS === "1",
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      `--disable-extensions-except=${DIST_DIR}`,
      `--load-extension=${DIST_DIR}`
    ]
  };

  if (process.env.PRISM_E2E_CHANNEL) {
    launchOptions.channel = process.env.PRISM_E2E_CHANNEL;
  }

  context = await chromium.launchPersistentContext(PROFILE_DIR, launchOptions);

  const { serviceWorker, extensionId } = await resolveExtensionRuntime(context);
  logStep(`Extension runtime ready: ${extensionId}`);

  if (serviceWorker) {
    logStep(`Service worker ready: ${serviceWorker.url()}`);
    serviceWorker.on("console", (message) => {
      workerLogs.push({
        type: message.type(),
        text: message.text(),
        location: message.location()
      });
    });
  } else {
    logStep("Service worker target was resolved through CDP fallback.");
  }

  const automationPage = await context.newPage();
  await automationPage.goto(`chrome-extension://${extensionId}/automation.html`, {
    waitUntil: "domcontentloaded"
  });
  logStep(`Automation bridge opened: chrome-extension://${extensionId}/automation.html`);

  await ensureGlobalPermission(automationPage);
  logStep("Global permission confirmed.");

  const results = [];

  if (TARGETS.has("fixtures") || TARGETS.has("all")) {
    results.push(...(await runFixtureScenarios(context, automationPage, fixtureServer)));
  }

  if (TARGETS.has("public-sites") || TARGETS.has("all")) {
    results.push(...(await runPublicSiteScenarios(context, automationPage)));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    extensionId,
    results,
    workerLogs
  };

  await writeFile(resolve(OUTPUT_ROOT, "auto-booster-report.json"), JSON.stringify(report, null, 2), "utf8");
  await writeFile(resolve(OUTPUT_ROOT, "auto-booster-report.md"), renderMarkdownReport(report), "utf8");

  const hasFailure = results.some((result) => !result.passed);
  if (hasFailure) {
    process.exitCode = 1;
  }
} finally {
  await fixtureServer?.close().catch(() => undefined);
  await context?.close().catch(() => undefined);
}

async function runFixtureScenarios(context, automationPage, fixtureServer) {
  if (!fixtureServer) {
    return [];
  }

  const baseUrl = fixtureServer.baseUrl;
  const scenarios = [
    {
      name: "fixture-site-audio-basic",
      url: `${baseUrl}/audio-basic.html`,
      mode: "site",
      async run(page, tabId) {
        await page.click("#start-playback");
        const finalDebug = await waitForDebugState(automationPage, tabId, (debug) => debug?.attachState === "attached");
        return evaluateScenarioResult("attached", finalDebug);
      }
    },
    {
      name: "fixture-global-new-tab",
      url: `${baseUrl}/audio-basic.html`,
      mode: "global-new-tab",
      async run(page, tabId) {
        await waitForAttachOrGestureWithRecovery({
          automationPage,
          page,
          tabId,
          startPlayback: async (targetPage) => {
            await targetPage.click("#start-playback");
            return true;
          }
        });

        const secondPage = await context.newPage();
        await secondPage.goto(`${baseUrl}/audio-basic.html`, { waitUntil: "domcontentloaded" });
        await secondPage.bringToFront();
        const secondTab = await getActiveTab(automationPage);
        const { finalDebug } = await waitForAttachOrGestureWithRecovery({
          automationPage,
          page: secondPage,
          tabId: secondTab.id,
          startPlayback: async (targetPage) => {
            await targetPage.click("#start-playback");
            return true;
          }
        });
        await captureScenarioScreenshot(secondPage, "fixture-global-new-tab");
        await secondPage.close().catch(() => undefined);
        return evaluateScenarioResult("attached", finalDebug);
      }
    },
    {
      name: "fixture-awaiting-gesture",
      url: `${baseUrl}/audio-autoplay-blocked.html`,
      mode: "global",
      async run(page, tabId) {
        const waitingDebug = await waitForDebugState(
          automationPage,
          tabId,
          (debug) => debug?.attachState === "awaiting_user_gesture"
        );
        await page.click("#unlock-playback");
        const finalDebug = await waitForDebugState(automationPage, tabId, (debug) => debug?.attachState === "attached");
        return evaluateScenarioResult("awaiting_then_attached", finalDebug, waitingDebug);
      }
    },
    {
      name: "fixture-spa-media",
      url: `${baseUrl}/spa-media.html`,
      mode: "global",
      async run(page, tabId) {
        await page.waitForSelector("#fixture-audio");
        const { finalDebug } = await waitForAttachOrGestureWithRecovery({
          automationPage,
          page,
          tabId,
          startPlayback: async (targetPage) => {
            await targetPage.click("#start-playback");
            return true;
          }
        });
        return evaluateScenarioResult("attached", finalDebug);
      }
    },
    {
      name: "fixture-no-media",
      url: `${baseUrl}/no-media.html`,
      mode: "global",
      async run(_page, tabId) {
        const finalDebug = await waitForDebugState(
          automationPage,
          tabId,
          (debug) => debug?.attachState === "observing" && debug?.attachReason === "no_media"
        );
        return evaluateScenarioResult("observing_no_media", finalDebug);
      }
    },
    {
      name: "fixture-video-basic",
      url: `${baseUrl}/video-basic.html`,
      mode: "global",
      async run(page, tabId) {
        const { finalDebug } = await waitForAttachOrGestureWithRecovery({
          automationPage,
          page,
          tabId,
          startPlayback: async (targetPage) => {
            await targetPage.click("#start-playback");
            return true;
          }
        });
        return evaluateScenarioResult("attached", finalDebug);
      }
    }
  ].filter((scenario) => SCENARIO_SET.size === 0 || SCENARIO_SET.has(scenario.name));

  const results = [];

  for (const scenario of scenarios) {
    logStep(`Starting fixture scenario: ${scenario.name}`);
    await resetExtensionState(automationPage);
    const page = await context.newPage();
    await page.goto(scenario.url, { waitUntil: "domcontentloaded" });
    await page.bringToFront();
    const activeTab = await getActiveTab(automationPage);
    logScenarioData(scenario.name, "active-tab", activeTab);
    const armResponse = await armScenario(automationPage, activeTab.id, scenario.mode);
    const initialDebugResponse = await getDebugStateResponse(automationPage, activeTab.id);
    const initialDebug = initialDebugResponse?.ok ? initialDebugResponse.data : null;
    logScenarioData(scenario.name, "initial-debug", initialDebug);
    const outcome = await scenario.run(page, activeTab.id);
    const finalDebugResponse = await getDebugStateResponse(automationPage, activeTab.id);
    const finalDebug = outcome.finalDebug ?? (finalDebugResponse?.ok ? finalDebugResponse.data : null);
    const stateResponse = await getStateResponse(automationPage);
    const state = stateResponse?.ok ? stateResponse.data : null;
    logScenarioData(scenario.name, "final-debug", finalDebug);

    results.push({
      name: scenario.name,
      target: scenario.url,
      classification: outcome.classification,
      passed: outcome.passed,
      armResponse,
      initialDebugResponse,
      initialDebug,
      finalDebugResponse,
      finalDebug,
      stateResponse,
      workerState: state
    });

    await captureScenarioScreenshot(page, scenario.name);
    await page.close().catch(() => undefined);
    logStep(`Finished fixture scenario: ${scenario.name} -> ${outcome.classification}`);
  }

  return results;
}

async function runPublicSiteScenarios(context, automationPage) {
  const scenarios = [
    {
      name: "youtube-global",
      url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
      mode: "global",
      startPlayback: startYouTubePlayback
    },
    {
      name: "youtube-site",
      url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
      mode: "site",
      startPlayback: startYouTubePlayback
    },
    {
      name: "youtube-music-global",
      url: "https://music.youtube.com/watch?v=jNQXAC9IVRw",
      mode: "global",
      startPlayback: startYouTubeMusicPlayback
    },
    {
      name: "twitch-global",
      url: "https://www.twitch.tv/monstercat",
      mode: "global",
      startPlayback: startTwitchPlayback
    },
    {
      name: "kick-global",
      url: "https://kick.com/xqc",
      mode: "global",
      startPlayback: startKickPlayback
    },
    {
      name: "rumble-global",
      url: "https://rumble.com/",
      mode: "global",
      startPlayback: startRumblePlayback
    }
  ]
    .filter((scenario) => SITE_SET.size === 0 || SITE_SET.has(scenario.name))
    .filter((scenario) => SCENARIO_SET.size === 0 || SCENARIO_SET.has(scenario.name));

  const results = [];

  for (const scenario of scenarios) {
    logStep(`Starting public-site scenario: ${scenario.name}`);
    await resetExtensionState(automationPage);
    const page = await context.newPage();
    await page.goto(scenario.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await dismissCommonBanners(page);
    await page.bringToFront();
    const activeTab = await getActiveTab(automationPage);
    logScenarioData(scenario.name, "active-tab", activeTab);
    const armResponse = await armScenario(automationPage, activeTab.id, scenario.mode);
    const initialDebugResponse = await getDebugStateResponse(automationPage, activeTab.id);
    const initialDebug = initialDebugResponse?.ok ? initialDebugResponse.data : null;
    logScenarioData(scenario.name, "initial-debug", initialDebug);

    let playbackStarted = false;
    let finalDebug = null;
    try {
      const outcome = await waitForAttachOrGestureWithRecovery({
        automationPage,
        page,
        tabId: activeTab.id,
        startPlayback: scenario.startPlayback,
        timeoutMs: 15000,
        allowAwaitingGesture: true
      });
      playbackStarted = outcome.playbackStarted;
      finalDebug = outcome.finalDebug;
    } catch {
      playbackStarted = false;
    }

    finalDebug ??= await pollForDebugState(automationPage, activeTab.id, 5000);
    const finalDebugResponse = await getDebugStateResponse(automationPage, activeTab.id);
    const classification = classifyPublicSiteResult(initialDebug, finalDebug, playbackStarted);
    const stateResponse = await getStateResponse(automationPage);
    const state = stateResponse?.ok ? stateResponse.data : null;
    logScenarioData(scenario.name, "final-debug", finalDebug);

    results.push({
      name: scenario.name,
      target: scenario.url,
      classification,
      passed: classification !== "product_bug",
      armResponse,
      initialDebugResponse,
      initialDebug,
      finalDebugResponse,
      finalDebug,
      playbackStarted,
      stateResponse,
      workerState: state
    });

    await captureScenarioScreenshot(page, scenario.name);
    await page.close().catch(() => undefined);
    logStep(`Finished public-site scenario: ${scenario.name} -> ${classification}`);
  }

  return results;
}

async function armScenario(automationPage, tabId, mode) {
  logStep(`Arming tab ${tabId} with mode ${mode}`);
  if (mode === "site") {
    return sendCommandDetailed(automationPage, {
      type: "ENABLE_CURRENT_TAB_BOOSTER",
      payload: { tabId, gainPercent: 100 }
    });
  }

  return sendCommandDetailed(automationPage, {
    type: "ENABLE_GLOBAL_AUTO_BOOSTER",
    payload: { tabId, gainPercent: 100 }
  });
}

async function resetExtensionState(automationPage) {
  logStep("Resetting extension state.");
  await sendCommandDetailed(automationPage, { type: "STOP_ALL" });
  await sendCommandDetailed(automationPage, { type: "DISABLE_GLOBAL_AUTO_BOOSTER" });
}

async function ensureGlobalPermission(automationPage) {
  const hasPermission = await automationPage.evaluate(() => window.__PRISM_AUTOMATION__.hasGlobalPermission());

  if (hasPermission) {
    return;
  }

  await automationPage.click("[data-action='request-global-permission']");
  await waitFor(async () => automationPage.evaluate(() => window.__PRISM_AUTOMATION__.hasGlobalPermission()), 10000);
}

async function waitForServiceWorker(context) {
  const existing = context.serviceWorkers()[0];

  if (existing) {
    return existing;
  }

  return context.waitForEvent("serviceworker", { timeout: 30000 });
}

async function resolveExtensionRuntime(context) {
  try {
    const serviceWorker = await waitForServiceWorker(context);
    return {
      serviceWorker,
      extensionId: new URL(serviceWorker.url()).host
    };
  } catch {
    const extensionId = await findExtensionIdViaCdp(context);

    if (!extensionId) {
      throw new Error("Could not resolve extension runtime through service worker or CDP targets.");
    }

    return {
      serviceWorker: null,
      extensionId
    };
  }
}

async function findExtensionIdViaCdp(context) {
  const probePage = await context.newPage();

  try {
    const session = await context.newCDPSession(probePage);
    const target = await waitFor(async () => {
      const { targetInfos } = await session.send("Target.getTargets");
      return (
        targetInfos.find(
          (targetInfo) =>
            targetInfo.url.startsWith("chrome-extension://") &&
            ["service_worker", "background_page", "page", "other"].includes(targetInfo.type)
        ) ?? null
      );
    }, 30000);

    return target ? new URL(target.url).host : null;
  } finally {
    await probePage.close().catch(() => undefined);
  }
}

async function sendCommand(automationPage, command) {
  return automationPage.evaluate(
    async (payload) => window.__PRISM_AUTOMATION__.sendCommand(payload),
    command
  );
}

async function sendCommandDetailed(automationPage, command) {
  return automationPage.evaluate(
    async (payload) => window.__PRISM_AUTOMATION__.sendCommandDetailed(payload),
    command
  );
}

async function getState(automationPage) {
  return automationPage.evaluate(() => window.__PRISM_AUTOMATION__.getState());
}

async function getStateResponse(automationPage) {
  return automationPage.evaluate(() => window.__PRISM_AUTOMATION__.getStateDetailed());
}

async function getActiveTab(automationPage) {
  const activeTab = await automationPage.evaluate(() => window.__PRISM_AUTOMATION__.getActiveTab());

  if (!activeTab) {
    throw new Error("No active tab could be resolved from the automation bridge.");
  }

  return activeTab;
}

async function getDebugState(automationPage, tabId) {
  return automationPage.evaluate(
    async (payload) => window.__PRISM_AUTOMATION__.getDebugState(payload),
    tabId
  );
}

async function getDebugStateResponse(automationPage, tabId) {
  return automationPage.evaluate(
    async (payload) => window.__PRISM_AUTOMATION__.getDebugStateDetailed(payload),
    tabId
  );
}

async function pollForDebugState(automationPage, tabId, timeoutMs) {
  const start = Date.now();
  let lastDebug = await getDebugState(automationPage, tabId);

  while (Date.now() - start < timeoutMs) {
    await wait(250);
    lastDebug = await getDebugState(automationPage, tabId);

    if (lastDebug?.attachState === "attached" || lastDebug?.attachState === "awaiting_user_gesture") {
      return lastDebug;
    }
  }

  return lastDebug;
}

async function waitForDebugState(automationPage, tabId, predicate, timeoutMs = 12000) {
  return waitFor(async () => {
    const debug = await getDebugState(automationPage, tabId);
    return predicate(debug) ? debug : null;
  }, timeoutMs);
}

async function waitForAttachOrGestureWithRecovery({
  automationPage,
  page,
  tabId,
  startPlayback,
  timeoutMs = 15000,
  allowAwaitingGesture = false
}) {
  const deadline = Date.now() + timeoutMs;
  let playbackStarted = false;
  let recoveryObserved = false;
  let playbackNeedsRetry = true;
  let finalDebug = await getDebugState(automationPage, tabId);

  while (Date.now() < deadline) {
    if (playbackNeedsRetry) {
      try {
        playbackStarted = (await startPlayback(page)) || playbackStarted;
      } catch {
        // Ignore playback kick failures; state polling below will decide the outcome.
      }

      playbackNeedsRetry = false;
    }

    finalDebug = await getDebugState(automationPage, tabId);

    if (finalDebug?.attachState === "attached") {
      return {
        finalDebug,
        playbackStarted,
        recoveryObserved
      };
    }

    if (allowAwaitingGesture && finalDebug?.attachState === "awaiting_user_gesture") {
      return {
        finalDebug,
        playbackStarted,
        recoveryObserved
      };
    }

    if (finalDebug?.recoveryPending && !recoveryObserved) {
      recoveryObserved = true;
      playbackNeedsRetry = true;

      await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => undefined);
      await wait(250);
      continue;
    }

    await wait(250);
  }

  return {
    finalDebug,
    playbackStarted,
    recoveryObserved
  };
}

function evaluateScenarioResult(expected, finalDebug, initialDebug = null) {
  if (expected === "attached") {
    return {
      classification: finalDebug?.attachState === "attached" ? "pass_auto" : "product_bug",
      passed: finalDebug?.attachState === "attached",
      finalDebug
    };
  }

  if (expected === "awaiting_then_attached") {
    const passed = initialDebug?.attachState === "awaiting_user_gesture" && finalDebug?.attachState === "attached";
    return {
      classification: passed ? "pass_after_user_gesture" : "product_bug",
      passed,
      finalDebug
    };
  }

  if (expected === "observing_no_media") {
    const passed = finalDebug?.attachState === "observing" && finalDebug?.attachReason === "no_media";
    return {
      classification: passed ? "pass_auto" : "product_bug",
      passed,
      finalDebug
    };
  }

  return {
    classification: "product_bug",
    passed: false,
    finalDebug
  };
}

function classifyPublicSiteResult(initialDebug, finalDebug, playbackStarted) {
  if (finalDebug?.attachState === "attached") {
    return initialDebug?.attachState === "awaiting_user_gesture" ? "pass_after_user_gesture" : "pass_auto";
  }

  if (finalDebug?.attachState === "awaiting_user_gesture") {
    return playbackStarted ? "product_bug" : "pass_after_user_gesture";
  }

  if (finalDebug?.attachState === "unsupported") {
    return "site_not_hookable";
  }

  if (finalDebug?.attachState === "failed") {
    return "fallback_manual_required";
  }

  return "product_bug";
}

async function captureScenarioScreenshot(page, name) {
  await page.screenshot({
    path: resolve(OUTPUT_ROOT, `${name}.png`),
    fullPage: true
  });
}

async function dismissCommonBanners(page) {
  await clickIfPresent(page, "button:has-text('Accept all')");
  await clickIfPresent(page, "button:has-text('I agree')");
  await clickIfPresent(page, "button:has-text('Accept')");
  await clickIfPresent(page, "button:has-text('Reject all')");
}

async function startYouTubePlayback(page) {
  await clickIfPresent(page, "button[aria-label*='Accept']");
  if (await clickIfPresent(page, ".ytp-play-button")) {
    return true;
  }

  if (await clickIfPresent(page, "video")) {
    return true;
  }

  await page.keyboard.press("k").catch(() => undefined);
  return Boolean(await page.locator("video").count());
}

async function startYouTubeMusicPlayback(page) {
  if (await clickIfPresent(page, "tp-yt-paper-icon-button[title*='Play']")) {
    return true;
  }

  await page.keyboard.press("k").catch(() => undefined);
  return Boolean(await page.locator("video").count());
}

async function startTwitchPlayback(page) {
  if (await clickIfPresent(page, "[data-a-target='content-classification-gate-overlay-start-watching-button']")) {
    await wait(500);
  }

  if (await clickIfPresent(page, "[data-a-target='player-play-pause-button']")) {
    return true;
  }

  return await clickIfPresent(page, "video");
}

async function startKickPlayback(page) {
  if (await clickIfPresent(page, "button[aria-label*='Play']")) {
    return true;
  }

  return await clickIfPresent(page, "video");
}

async function startRumblePlayback(page) {
  if (await clickIfPresent(page, "button[aria-label*='Play']")) {
    return true;
  }

  return await clickIfPresent(page, "video");
}

async function clickIfPresent(page, selector) {
  const locator = page.locator(selector).first();

  if ((await locator.count()) === 0) {
    return false;
  }

  await locator.click({ timeout: 3000 }).catch(() => undefined);
  return true;
}

async function waitFor(fn, timeoutMs) {
  const start = Date.now();
  let lastError;

  while (Date.now() - start < timeoutMs) {
    try {
      const value = await fn();
      if (value) {
        return value;
      }
    } catch (error) {
      lastError = error;
    }

    await wait(150);
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(`Timed out after ${timeoutMs}ms.`);
}

async function wait(milliseconds) {
  await new Promise((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds);
  });
}

function parseTargets(argv) {
  const targetArgument = argv.find((argument) => argument.startsWith("--targets="));
  const targetValue = targetArgument ? targetArgument.split("=")[1] : "all";
  return new Set(targetValue.split(","));
}

function parseSiteFilter(argv) {
  const siteArgument = argv.find((argument) => argument.startsWith("--sites="));

  if (!siteArgument) {
    return [];
  }

  return siteArgument
    .split("=")[1]
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseScenarioFilter(argv) {
  const scenarioArgument = argv.find((argument) => argument.startsWith("--scenarios="));

  if (!scenarioArgument) {
    return [];
  }

  return scenarioArgument
    .split("=")[1]
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function logStep(message) {
  console.log(`[auto-booster] ${message}`);
}

function logScenarioData(name, label, payload) {
  console.log(`[auto-booster][${name}] ${label}: ${JSON.stringify(payload, null, 2)}`);
}

function renderMarkdownReport(report) {
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
