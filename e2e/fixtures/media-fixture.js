(function bootstrapPrismFixture() {
  const SAMPLE_RATE = 44100;
  const DURATION_SECONDS = 1.5;
  const FREQUENCY_HZ = 220;
  let cachedToneDataUrl;

  function createToneDataUrl() {
    if (cachedToneDataUrl) {
      return cachedToneDataUrl;
    }

    const frameCount = Math.floor(SAMPLE_RATE * DURATION_SECONDS);
    const bytesPerSample = 2;
    const dataSize = frameCount * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    writeAscii(view, 0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeAscii(view, 8, "WAVE");
    writeAscii(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, SAMPLE_RATE, true);
    view.setUint32(28, SAMPLE_RATE * bytesPerSample, true);
    view.setUint16(32, bytesPerSample, true);
    view.setUint16(34, 16, true);
    writeAscii(view, 36, "data");
    view.setUint32(40, dataSize, true);

    for (let index = 0; index < frameCount; index += 1) {
      const time = index / SAMPLE_RATE;
      const sample = Math.sin(2 * Math.PI * FREQUENCY_HZ * time);
      view.setInt16(44 + index * bytesPerSample, sample * 32767 * 0.35, true);
    }

    const binary = new Uint8Array(buffer).reduce((accumulator, byte) => accumulator + String.fromCharCode(byte), "");
    cachedToneDataUrl = `data:audio/wav;base64,${btoa(binary)}`;
    return cachedToneDataUrl;
  }

  function writeAscii(view, offset, value) {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  }

  function ensureElement(tagName, target, id) {
    const existing = document.getElementById(id);

    if (existing instanceof HTMLMediaElement) {
      return existing;
    }

    const element = document.createElement(tagName);
    element.id = id;
    element.controls = true;
    element.loop = true;
    element.preload = "auto";
    element.src = createToneDataUrl();

    if (tagName === "video") {
      element.setAttribute("playsinline", "true");
      element.style.width = "360px";
      element.style.height = "204px";
      element.style.background = "#111827";
      element.poster =
        "data:image/svg+xml;charset=utf-8," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="204" viewBox="0 0 360 204"><rect width="360" height="204" fill="#111827"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#f8fafc" font-family="Segoe UI" font-size="28">Video Fixture</text></svg>'
        );
    }

    target.appendChild(element);
    return element;
  }

  async function playElement(element) {
    try {
      await element.play();
      return true;
    } catch (error) {
      return false;
    }
  }

  window.PrismFixture = {
    ensureAudio(targetId, id = "fixture-audio") {
      const target = document.getElementById(targetId) || document.body;
      return ensureElement("audio", target, id);
    },
    ensureVideo(targetId, id = "fixture-video") {
      const target = document.getElementById(targetId) || document.body;
      return ensureElement("video", target, id);
    },
    playElementById(id) {
      const element = document.getElementById(id);

      if (!(element instanceof HTMLMediaElement)) {
        return Promise.resolve(false);
      }

      return playElement(element);
    },
    insertAudioLater(targetId, id = "fixture-audio", delayMs = 1200) {
      window.setTimeout(() => {
        ensureElement("audio", document.getElementById(targetId) || document.body, id);
      }, delayMs);
    }
  };
})();
