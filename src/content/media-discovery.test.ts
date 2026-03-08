// @vitest-environment happy-dom

import { discoverMediaElements } from "./media-discovery";

describe("discoverMediaElements", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("collects media from the document and nested open shadow roots", () => {
    document.body.innerHTML = `
      <audio id="root-audio"></audio>
      <div id="host"></div>
    `;

    const host = document.getElementById("host") as HTMLDivElement;
    const shadowRoot = host.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = `
      <video id="shadow-video"></video>
      <section id="nested-host"></section>
    `;

    const nestedHost = shadowRoot.getElementById("nested-host") as HTMLElement;
    const nestedShadowRoot = nestedHost.attachShadow({ mode: "open" });
    nestedShadowRoot.innerHTML = `<audio id="nested-audio"></audio>`;

    const ids = discoverMediaElements()
      .map((element) => element.id)
      .sort();

    expect(ids).toEqual(["nested-audio", "root-audio", "shadow-video"]);
  });

  it("returns an empty list when no media is available", () => {
    document.body.innerHTML = `<main><h1>No media</h1></main>`;

    expect(discoverMediaElements()).toEqual([]);
  });

  it("collects media from same-origin iframe documents", () => {
    document.body.innerHTML = `
      <audio id="root-audio"></audio>
      <iframe id="frame"></iframe>
    `;

    const frame = document.getElementById("frame") as HTMLIFrameElement;
    const frameDocument = document.implementation.createHTMLDocument("embedded");

    frameDocument.body.innerHTML = `<video id="frame-video"></video>`;

    Object.defineProperty(frame, "contentDocument", {
      configurable: true,
      get: () => frameDocument
    });

    const ids = discoverMediaElements()
      .map((element) => element.id)
      .sort();

    expect(ids).toEqual(["frame-video", "root-audio"]);
  });
});
