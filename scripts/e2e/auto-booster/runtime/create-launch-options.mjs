export function createLaunchOptions(distDir, env) {
  const launchOptions = {
    args: [`--disable-extensions-except=${distDir}`, `--load-extension=${distDir}`],
    headless: env.PRISM_E2E_HEADLESS === "1",
    ignoreDefaultArgs: ["--disable-extensions"]
  };

  if (env.PRISM_E2E_CHANNEL) {
    launchOptions.channel = env.PRISM_E2E_CHANNEL;
  }

  return launchOptions;
}
