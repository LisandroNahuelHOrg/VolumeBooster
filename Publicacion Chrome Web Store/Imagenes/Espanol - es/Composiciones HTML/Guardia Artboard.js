(() => {
  const EPSILON = 0.5;

  function serializeRect(rect) {
    return {
      left: Math.round(rect.left * 100) / 100,
      top: Math.round(rect.top * 100) / 100,
      right: Math.round(rect.right * 100) / 100,
      bottom: Math.round(rect.bottom * 100) / 100,
      width: Math.round(rect.width * 100) / 100,
      height: Math.round(rect.height * 100) / 100
    };
  }

  function getSafeFrame() {
    return document.querySelector("[data-safe-frame]") || document.querySelector(".safe-frame");
  }

  function syncShotFrames() {
    const frames = [...document.querySelectorAll("[data-shot-ratio='auto']")];
    const issues = [];

    for (const frame of frames) {
      const img = frame.querySelector("img");

      if (!img) {
        issues.push({
          label: frame.getAttribute("data-safe-label") || frame.className || frame.tagName,
          error: "Missing <img> inside data-shot-ratio='auto' frame."
        });
        continue;
      }

      if (!img.complete || !img.naturalWidth || !img.naturalHeight) {
        issues.push({
          label: frame.getAttribute("data-safe-label") || frame.className || frame.tagName,
          error: "Screenshot image is not ready for ratio lock."
        });
        continue;
      }

      frame.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
      frame.style.height = "auto";
      frame.dataset.resolvedShotRatio = `${img.naturalWidth}/${img.naturalHeight}`;

      if ((frame.dataset.shotFit || "").toLowerCase() === "contain") {
        img.style.objectFit = "contain";
        img.style.objectPosition = "center top";
      }
    }

    return issues;
  }

  function validate() {
    const safeFrame = getSafeFrame();

    if (!safeFrame) {
      document.documentElement.dataset.safeStatus = "overflow";
      return {
        ok: false,
        error: "Missing .safe-frame / [data-safe-frame] element."
      };
    }

    const frameRect = safeFrame.getBoundingClientRect();
    const items = [...document.querySelectorAll("[data-safe-item]")];
    const issues = [];
    const preflightIssues = syncShotFrames();

    for (const item of items) {
      const rect = item.getBoundingClientRect();
      const overflow = {
        left: Math.max(0, frameRect.left - rect.left),
        top: Math.max(0, frameRect.top - rect.top),
        right: Math.max(0, rect.right - frameRect.right),
        bottom: Math.max(0, rect.bottom - frameRect.bottom)
      };

      if (overflow.left > EPSILON || overflow.top > EPSILON || overflow.right > EPSILON || overflow.bottom > EPSILON) {
        issues.push({
          label: item.getAttribute("data-safe-label") || item.className || item.tagName,
          overflow,
          rect: serializeRect(rect)
        });
      }
    }

    const result = {
      ok: issues.length === 0 && preflightIssues.length === 0,
      frame: serializeRect(frameRect),
      itemCount: items.length,
      preflightIssues,
      issues
    };

    document.documentElement.dataset.safeStatus = result.ok ? "ok" : "overflow";
    return result;
  }

  function showOutline(enabled = true) {
    document.documentElement.dataset.safeOutline = enabled ? "true" : "false";
    return validate();
  }

  window.__STORE_ARTBOARD__ = {
    validate,
    showOutline
  };

  window.addEventListener("load", () => {
    validate();
  });
})();
