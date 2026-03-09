import { resolve } from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

import {
  createSentryVitePlugin,
  getSentryBuildSourcemapMode
} from "./src/shared/observability/sentry-build";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const sentryPlugin = createSentryVitePlugin(env);

  return {
    base: "./",
    plugins: sentryPlugin ? [sentryPlugin] : [],
    publicDir: "public",
    resolve: {
      alias: {
        // faustwasm bundles browser and Node helpers in one entry; browser builds must not resolve Node builtins.
        fs: resolve(__dirname, "src/shims/vite-browser-fs.ts"),
        url: resolve(__dirname, "src/shims/vite-browser-url.ts")
      }
    },
    build: {
      emptyOutDir: true,
      outDir: "dist",
      sourcemap: getSentryBuildSourcemapMode(env),
      rollupOptions: {
        input: {
          popup: resolve(__dirname, "popup.html"),
          automation: resolve(__dirname, "automation.html"),
          offscreen: resolve(__dirname, "offscreen.html"),
          background: resolve(__dirname, "src/background/main.ts"),
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
  };
});
