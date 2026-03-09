# All Sites Main-World Contract

## Purpose

This document protects the `All Sites / All Tabs` automatic booster lane from a
specific class of regressions that can silently disable the feature across the
entire product.

## Incident Summary

A previous change exposed test helpers by adding top-level exports to
`src/content/main-world.ts`. That file is not a normal library module. It is
the runtime bridge injected into the page `MAIN` world through the registered
content-script pipeline. Once top-level exports were introduced, the resulting
bundle no longer matched the integration contract expected by the global
auto-booster path, and the `All Sites` mode stopped working across sites.

## Non-Negotiable Rules

1. `src/content/main-world.ts` must remain a side-effect-oriented runtime file.
   Do not add top-level exports to it.
2. `src/content/registered-main.ts` must stay as a minimal side-effect entry:
   `import "./main-world";`
3. `vite.registered-content-scripts.config.ts` must keep the registered
   main-world build in `iife` format.
4. Test-only access to main-world internals must be exposed only behind
   `import.meta.env.MODE === "test"` and attached to a test-only window hook.
   Do not expose those helpers through production exports.
5. Any refactor that touches the main-world bridge, its registered entrypoint,
   or the registered content-script build config must preserve the regression
   test in `src/content/main-world.test.ts`.

## Why This Contract Exists

- The global auto-booster uses the registered content-script path, not the
  popup lane and not the offscreen manual lane.
- The main-world bridge is loaded for side effects and bootstraps its own
  runtime by patching Web Audio APIs in the page context.
- Small module-shape changes can keep TypeScript and unit tests green while
  still breaking runtime injection in the browser.

## Required Verification Before Shipping

Run both commands whenever touching any of these files:

- `src/content/main-world.ts`
- `src/content/registered-main.ts`
- `vite.registered-content-scripts.config.ts`
- `src/content/main-world.test.ts`

Commands:

```powershell
npm test -- src/content/main-world.test.ts
npm run build
```

## Enforcement

The regression test in `src/content/main-world.test.ts` verifies all of the
following:

- `src/content/main-world.ts` does not gain top-level exports
- `src/content/registered-main.ts` stays side-effect-only
- the registered content-script build config still emits the main-world bundle
  as `iife`

If you believe this contract must change, treat it as an architectural change,
not as a local refactor. Update this document, the code comments, and the
regression test together in the same change.
