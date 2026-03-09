# Prism Volume Booster i18n

This repository uses Chrome Extension `_locales` catalogs with `en` as the canonical source of truth.

## Architecture

- Canonical catalog: [`public/_locales/en/messages.json`](/D:/Local%20Worktrees/WorktreeIzqAbajo/public/_locales/en/messages.json)
- Secondary locales: `public/_locales/<locale>/messages.json`
- Generated artifacts:
  - [`src/generated/i18n-types.ts`](/D:/Local%20Worktrees/WorktreeIzqAbajo/src/generated/i18n-types.ts)
  - [`src/generated/i18n-fallback.ts`](/D:/Local%20Worktrees/WorktreeIzqAbajo/src/generated/i18n-fallback.ts)
- Runtime helpers:
  - [`src/shared/runtime-i18n.ts`](/D:/Local%20Worktrees/WorktreeIzqAbajo/src/shared/runtime-i18n.ts)
  - [`src/content/runtime-api.ts`](/D:/Local%20Worktrees/WorktreeIzqAbajo/src/content/runtime-api.ts)

## Rules

- Add or rename keys only in `en`.
- Every non-English locale must keep exact key parity with `en`.
- Every placeholder definition must match the canonical catalog exactly.
- Visible copy must never live inline in TypeScript or HTML when it can live in `_locales`.
- Runtime fallback for visible UI always comes from the generated English catalog, never from ad-hoc hardcoded strings.
- If a message should intentionally stay identical to English in another locale, add its key to [`scripts/i18n-identical-allowlist.json`](/D:/Local%20Worktrees/WorktreeIzqAbajo/scripts/i18n-identical-allowlist.json).

## Naming

- Use product-facing keys, not component-local abbreviations.
- Prefer stable semantic names such as `laneGlobalPermissionTitle`, `presetWarmCinematicSubtitle`, `automationRestoreAllSitesAccess`.
- Use `...Title`, `...Subtitle`, `...Label`, `...Detail`, `...HelpText`, `...HelpLabel` consistently.
- Use plural families with Chrome-style suffixes: `_zero`, `_one`, `_two`, `_few`, `_many`, `_other`.

## Descriptions

- Every English entry must include a contextual `description`.
- The description must explain where the text appears and what it means.
- Do not use boilerplate such as `Localized UI copy for ...` or `Label text for ...`.
- Include placeholder intent when applicable.

## Verification

Run these before shipping i18n changes:

```powershell
npm run i18n:generate
npm run i18n:check
npm run i18n:audit
npm run verify
```

## Scope covered by the literal audit

- `popup.html`
- `offscreen.html`
- `src/popup`
- `src/offscreen`
- `src/worker`
- `src/shared`
- `src/content`
- `src/automation`
