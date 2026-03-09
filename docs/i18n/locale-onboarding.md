# Adding a New Locale

## 1. Create the locale catalog

Create a new folder under [`public/_locales`](/D:/Local%20Worktrees/WorktreeIzqAbajo/public/_locales) using the Chrome locale code:

- `fr`
- `de`
- `pt_BR`
- `ar`

Add `messages.json` by copying the canonical English catalog from [`public/_locales/en/messages.json`](/D:/Local%20Worktrees/WorktreeIzqAbajo/public/_locales/en/messages.json).

## 2. Translate only the `message` values

- Keep all keys identical to `en`.
- Do not change placeholder definitions.
- Keep descriptions only in `en`; non-English locales do not need them.

## 3. Decide if any labels must remain in English

If a key should intentionally stay identical to English, add it to:

- [`scripts/i18n-identical-allowlist.json`](/D:/Local%20Worktrees/WorktreeIzqAbajo/scripts/i18n-identical-allowlist.json)

Do not rely on accidental English carry-over.

## 4. Validate the locale

```powershell
npm run i18n:generate
npm run i18n:check
npm run i18n:audit
```

## 5. Final repo validation

```powershell
npm run verify
```

## Common failure modes

- Missing key in the new locale
- Extra key not present in `en`
- Placeholder mismatch such as `$COUNT$` or `$DOMAIN$`
- Missing plural forms for the locale
- Copy still identical to English without allowlisting
- New UI text introduced inline in TypeScript or HTML instead of `_locales`

## Before shipping

- Check the popup in the target locale
- Check any automation or fallback surfaces that render outside the popup
- If the locale is RTL, verify document `dir`, layout alignment, and text overflow manually
