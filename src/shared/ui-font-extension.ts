/**
 * @fileoverview Packaged Montserrat font-face injection for extension pages.
 */
import montserratCyrillicExtUrl from "../assets/fonts/montserrat/montserrat-cyrillic-ext.woff2";
import montserratCyrillicUrl from "../assets/fonts/montserrat/montserrat-cyrillic.woff2";
import montserratVietnameseUrl from "../assets/fonts/montserrat/montserrat-vietnamese.woff2";
import montserratLatinExtUrl from "../assets/fonts/montserrat/montserrat-latin-ext.woff2";
import montserratLatinUrl from "../assets/fonts/montserrat/montserrat-latin.woff2";
import { UI_FONT_STYLE_ID } from "./ui-font-stack";

const TECHNICAL_EXTENSION_UI_FONT_FACE_CSS = `
@font-face {
  font-family: "Montserrat";
  font-style: normal;
  font-weight: 500 800;
  font-display: swap;
  src: url(${montserratCyrillicExtUrl}) format("woff2");
  unicode-range: U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
}

@font-face {
  font-family: "Montserrat";
  font-style: normal;
  font-weight: 500 800;
  font-display: swap;
  src: url(${montserratCyrillicUrl}) format("woff2");
  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}

@font-face {
  font-family: "Montserrat";
  font-style: normal;
  font-weight: 500 800;
  font-display: swap;
  src: url(${montserratVietnameseUrl}) format("woff2");
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}

@font-face {
  font-family: "Montserrat";
  font-style: normal;
  font-weight: 500 800;
  font-display: swap;
  src: url(${montserratLatinExtUrl}) format("woff2");
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

@font-face {
  font-family: "Montserrat";
  font-style: normal;
  font-weight: 500 800;
  font-display: swap;
  src: url(${montserratLatinUrl}) format("woff2");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
`.trim();

/**
 * Ensures the packaged Montserrat faces are available in an extension page.
 */
export function ensureExtensionUiFontFaces(targetDocument: Document): void {
  if (targetDocument.getElementById(UI_FONT_STYLE_ID)) {
    return;
  }

  const styleElement = targetDocument.createElement("style");
  styleElement.id = UI_FONT_STYLE_ID;
  styleElement.textContent = TECHNICAL_EXTENSION_UI_FONT_FACE_CSS;

  const parent = targetDocument.head ?? targetDocument.documentElement;
  parent.appendChild(styleElement);
}
