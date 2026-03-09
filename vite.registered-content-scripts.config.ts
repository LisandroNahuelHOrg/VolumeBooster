import { resolve } from "node:path";
import { defineConfig } from "vite";

const target = process.env.PRISM_REGISTERED_CONTENT_SCRIPT_TARGET;

if (target !== "isolated" && target !== "main") {
  throw new Error(
    "PRISM_REGISTERED_CONTENT_SCRIPT_TARGET must be set to 'isolated' or 'main'."
  );
}

const isMainWorld = target === "main";

export default defineConfig({
  publicDir: false,
  resolve: {
    alias: {
      fs: resolve(__dirname, "src/shims/vite-browser-fs.ts"),
      url: resolve(__dirname, "src/shims/vite-browser-url.ts")
    }
  },
  build: {
    emptyOutDir: false,
    outDir: "dist",
    sourcemap: true,
    lib: {
      // Guardrail:
      // The global auto-booster main-world script must keep this registered
      // entrypoint + IIFE shape. Regressions here can leave `All Sites / All
      // Tabs` completely non-functional even when typecheck and unit tests pass.
      entry: resolve(
        __dirname,
        isMainWorld ? "src/content/registered-main.ts" : "src/content/registered-isolated.ts"
      ),
      name: isMainWorld ? "PrismAutoBoosterMain" : "PrismAutoBoosterIsolated",
      formats: ["iife"],
      fileName: () =>
        isMainWorld
          ? "content-scripts/auto-booster-main.js"
          : "content-scripts/auto-booster-isolated.js"
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  }
});
