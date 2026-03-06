(function bootstrapAutoBoosterMainLoader() {
  if (window.__PRISM_AUTO_BOOSTER_MAIN_IMPORT_PROMISE__) {
    return;
  }

  const currentScript = document.currentScript;

  if (!(currentScript instanceof HTMLScriptElement) || !currentScript.src) {
    return;
  }

  const loaderUrl = new URL(currentScript.src);
  const entryUrl = new URL("./assets/auto-booster-main.js", loaderUrl);
  window.__PRISM_AUTO_BOOSTER_MAIN_IMPORT_PROMISE__ = import(entryUrl.href);
})();
