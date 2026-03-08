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
});
