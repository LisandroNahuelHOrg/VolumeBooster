# Sentry setup for the Chrome MV3 extension

This project uses a conservative phase-1 Sentry integration tailored to the MV3 extension runtime.

## Covered contexts

- `popup`
- `offscreen`
- `automation`
- `background`

Not covered yet:

- `content` scripts
- Tracing
- Session Replay
- Metrics
- Session health / automatic browser sessions

## SDK choice

- SDK: `@sentry/browser`
- Build plugin: `@sentry/vite-plugin`
- No loader script is used.

## Runtime behavior

- Sentry initializes only when `VITE_SENTRY_DSN` is present at build time.
- If the DSN is missing, the runtime helper becomes a no-op.
- `sendDefaultPii` stays disabled.
- The SDK starts from the browser defaults, but filters out extra telemetry integrations that are outside phase 1.
- Automatic browser sessions are disabled in phase 1, so successful init should emit error events only.
- A shared `beforeSend` scrubber removes or redacts:
  - `tabUrl`
  - `tabTitle`
  - `favIconUrl`
  - `request`
  - `user`
  - query strings and hashes from URL-like fields

## Environment variables

Copy `.env.example` to a local `.env` file and fill in the values you need.

- `VITE_SENTRY_DSN`
- `VITE_SENTRY_ENVIRONMENT`
- `VITE_SENTRY_RELEASE`
- `VITE_SENTRY_SMOKE_MIRROR` (optional, smoke builds only)
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

## Sourcemaps

The main Vite build emits hidden sourcemaps only when runtime and upload credentials are both present.

Sourcemap upload is enabled only when all of these exist:

- `VITE_SENTRY_DSN`
- `VITE_SENTRY_RELEASE`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

If any of those are missing:

- the build still succeeds
- `npm run build` still works
- `npm run verify` still works
- Sentry sourcemaps are simply not uploaded

Registered content scripts are intentionally left out of phase 1.

## Deterministic smoke verification

For local smoke builds you can enable a transport mirror without changing production behavior:

- set `VITE_SENTRY_SMOKE_MIRROR=true`
- rebuild the extension
- trigger the controlled error you want to test

When that flag is on, the Sentry transport still sends real envelopes to ingest, but also mirrors the last few envelope attempts into `globalThis.__SENTRY_SMOKE_TRANSPORT__` inside the current MV3 context. This is especially useful for verifying the `background` service worker, where browser-level network tooling can be inconsistent.

## Verification

Suggested smoke-test workflow after setting a DSN:

1. Build the extension with a filled local `.env`.
2. Load the unpacked extension.
3. For `background` smoke tests, optionally set `VITE_SENTRY_SMOKE_MIRROR=true` and inspect `globalThis.__SENTRY_SMOKE_TRANSPORT__` from the service worker after triggering the controlled error.
4. Trigger a controlled error in `popup` or `background`.
5. Confirm the event reaches Sentry with:
   - `runtime_context`
   - `environment`
   - `extension_version`
   - `release` when configured
6. Confirm no sensitive tab metadata or request/user payloads were retained.
