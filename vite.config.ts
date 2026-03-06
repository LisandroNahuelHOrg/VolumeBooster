import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  publicDir: "public",
  build: {
    emptyOutDir: true,
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        automation: resolve(__dirname, "automation.html"),
        offscreen: resolve(__dirname, "offscreen.html"),
        background: resolve(__dirname, "src/background/main.ts"),
        "auto-booster": resolve(__dirname, "src/content/main.ts"),
        "faust-mono-worklet": resolve(__dirname, "src/offscreen/faust-mono-worklet.ts"),
        "faust-stereo-worklet": resolve(__dirname, "src/offscreen/faust-stereo-worklet.ts")
      },
      output: {
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === "background" ? "background.js" : "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]"
      }
    }
  },
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["src/**/*.test.ts"]
  }
});
