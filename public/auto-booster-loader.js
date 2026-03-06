(function bootstrapAutoBoosterLoader() {
  if (window.__PRISM_AUTO_BOOSTER_IMPORT_PROMISE__) {
    return;
  }

  const currentScript = document.currentScript;

  if (!(currentScript instanceof HTMLScriptElement) || !currentScript.src) {
    return;
  }

  const loaderUrl = new URL(currentScript.src);
  const entryUrl = new URL("./assets/auto-booster.js", loaderUrl);
  window.__PRISM_AUTO_BOOSTER_IMPORT_PROMISE__ = import(entryUrl.href);
})();
