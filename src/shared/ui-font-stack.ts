/**
 * @fileoverview Shared technical font constants for the extension UI.
 */
export const UI_FONT_STYLE_ID = "prism-ui-font-faces";
const TECHNICAL_UI_FONT_STACK = "'Montserrat', 'Segoe UI Variable', 'Segoe UI', 'Trebuchet MS', sans-serif";
export const UI_FONT_STACK = TECHNICAL_UI_FONT_STACK;
export const UI_FONT_RUNTIME_ASSET_PATHS = {
  cyrillicExt: "assets/montserrat-cyrillic-ext.woff2",
  cyrillic: "assets/montserrat-cyrillic.woff2",
  vietnamese: "assets/montserrat-vietnamese.woff2",
  latinExt: "assets/montserrat-latin-ext.woff2",
  latin: "assets/montserrat-latin.woff2"
} as const;
