# AGENTS.md

## Triple Mirror Contract

`AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` are mandatory repo-root mirror files.
The three files must always exist and remain byte-identical.

Rules every agent must follow:

1. Keep `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` present at the repository
   root at all times.
2. Whenever any one of the three files is modified, immediately replicate that
   finalized content to the other two before ending the task.
3. If one or two of the files are missing, recreate them immediately from the
   current canonical mirror.
4. If the three files diverge ambiguously, manually reconcile the most
   complete and up-to-date version first, then replicate that reconciled
   result to all three.
5. Use `npm run agents:sync` to mirror the triplet and `npm run agents:verify`
   or `npm run verify` to enforce that the three files still match exactly.

## Critical Global Auto-Booster Contract

The `All Sites / All Tabs` lane has a non-negotiable bundle contract around the
main-world bridge. A previous change added top-level exports to
`src/content/main-world.ts` so tests could import internals directly. That
broke the registered main-world content script and caused the global automatic
booster to fail across sites.

Rules every agent must follow:

1. Never add top-level `export` statements to `src/content/main-world.ts`.
2. Keep `src/content/registered-main.ts` side-effect-only: it must do nothing
   except `import "./main-world";`.
3. Keep the registered main-world bundle emitted as `iife` in
   `vite.registered-content-scripts.config.ts`.
4. If tests need internal access, expose test-only handles behind
   `import.meta.env.MODE === "test"` and never through production exports.
5. Before shipping any change that touches the global auto-booster lane, run:
   `npm test -- src/content/main-world.test.ts`
   `npm run build`

Reference: `docs/agent-guardrails/all-sites-main-world-contract.md`

## Global Host Access Contract

The `All Sites / All Tabs` lane now relies on install-time `host_permissions`
for `"<all_urls>"` in `public/manifest.json`. This is intentional: Chrome
should request global site access once during installation so users do not hit
an avoidable permission wall the first time they enable global auto-boost.

Rules every agent must follow:

1. Keep `"<all_urls>"` in `host_permissions`, not `optional_host_permissions`,
   unless the user explicitly asks to redesign the permission model.
2. Do not add an `onInstalled` permission-request flow. Chrome's install
   prompt for required host access is the intended first-run experience.
3. Keep `REQUEST_GLOBAL_PERMISSION` and `chrome.permissions.request(...)` as a
   recovery path only, for cases where Chrome or the user later restricts host
   access after installation.
4. Preserve the worker bootstrap downgrade that turns persisted global mode
   back to `off` when effective all-sites access is missing.
5. Before shipping any change that touches the permission model for global
   auto-boost, run:
   `npm test -- src/worker/auto-booster-client.test.ts src/worker/orchestrator.behavior.test.ts src/automation/main.test.ts src/shared/manifest-permissions.test.ts`
   `npm run build`

## i18n Readiness Contract

The repository now treats internationalization as a release gate, not a
best-effort polish pass. The canonical catalog is
`public/_locales/en/messages.json`, the generated English fallback lives in
`src/generated/i18n-fallback.ts`, and the repo-level policy is defined in
`i18n_config.json`.

Rules every agent must follow:

1. Add or rename message keys only in `public/_locales/en/messages.json`, then
   regenerate artifacts with `npm run i18n:generate`.
2. Do not place visible fallback copy inline in TypeScript or HTML. Runtime
   fallback for user-facing text must resolve through
   `src/shared/runtime-i18n.ts` / `src/content/runtime-api.ts` from the
   generated English catalog.
3. Keep visible user-facing strings out of `src/content`, `src/automation`,
   `src/popup`, `src/offscreen`, `popup.html`, and `offscreen.html` unless
   they are resolved through i18n helpers.
4. If a non-English locale intentionally keeps an English product term, add
   its key to `scripts/i18n-identical-allowlist.json`. Do not rely on
   untranslated copy passing unnoticed.
5. Keep message descriptions in the English catalog contextual and
   translator-facing. Boilerplate descriptions such as
   `Localized UI copy for ...` or `Label text for ...` are forbidden.
6. Before shipping any i18n-related change, run:
   `npm run i18n:generate`
   `npm run i18n:check`
   `npm run i18n:audit`
   `npm run verify`

Reference:
- `docs/i18n/README.md`
- `docs/i18n/glossary.md`
- `docs/i18n/locale-onboarding.md`

## Hyper-Modular Structure Contract

This repository now treats hyper-modular structure as a strict architectural rule,
not a style preference.

Rules every agent must follow:

1. No file may exceed `150 LOC`.
2. No file may contain more than `1 function`.
3. If a change would push a file above `150 LOC`, split the logic before shipping.
4. If a change requires additional functions, extract them into separate files instead
   of stacking multiple functions in the same file.
5. Treat this rule as mandatory across product code, tests, scripts, and supporting
   modules unless the user explicitly asks to redesign the rule itself.

## AI-Agent Long-Term Evolution Contract

Este repositorio debe optimizarse para desarrollo, mantenimiento y evolución 100% por agentes de IA a largo plazo. La regla arquitectónica por defecto es maximizar atomización y modularidad interna, pero minimizar la superficie pública y el churn externo.

Política obligatoria:
1. Cada archivo nuevo o refactorizado debe tener idealmente 1 sola función; si no aplica, debe quedar en <=150 LOC.
2. Separar siempre datos, tipos, constantes, cálculos, sanitización, mapeos y composición en módulos distintos.
3. Mantener una facade/barrel estable por dominio como punto de entrada público; los consumidores de producción no deben importar submódulos internos salvo necesidad excepcional y explícita.
4. Reducir al mínimo los exports públicos: exportar solo lo que usa producción; mover tablas, helpers y detalles de implementación a `internal/` o módulos privados.
5. Priorizar nombres de archivo semánticos y predecibles, alineados 1:1 con su responsabilidad.
6. Evitar archivos multi-responsabilidad, utilidades “cajón de sastre”, y barrels con lógica.
7. Todo refactor debe buscar menor acoplamiento, menor blast radius, menor costo de contexto y mayor facilidad de razonamiento local para agentes.
8. Los tests deben acompañar la frontera pública estable y, cuando haga falta, cubrir internals de forma localizada sin ensanchar innecesariamente el API pública.
9. Ante una duda entre conveniencia humana de corto plazo y modularidad mantenible por agentes a largo plazo, elegir la estructura más atómica, explícita y simétrica, siempre que preserve comportamiento y no aumente innecesariamente el churn de imports de producción.

Objetivo permanente:
internals hiper-atómicos + API pública pequeña y estable + refactors seguros + contexto local mínimo por archivo.

## Available skills for this context

- WorktreeDerAbajo: Abrir o crear el worktree fijo del monitor derecho inferior.
  (file: C:/Users/Lisandro/.codex/skills/workflow-WorktreeDerAbajo/SKILL.md)
- WorktreeDerArriba: Abrir o crear el worktree fijo del monitor derecho superior.
  (file: C:/Users/Lisandro/.codex/skills/workflow-WorktreeDerArriba/SKILL.md)
- WorktreeIzqArriba: Abrir o crear el worktree fijo del monitor izquierdo superior.
  (file: C:/Users/Lisandro/.codex/skills/workflow-WorktreeIzqArriba/SKILL.md)
- WorktreeIzqAbajo: Abrir o crear el worktree fijo del monitor izquierdo inferior.
  (file: C:/Users/Lisandro/.codex/skills/workflow-WorktreeIzqAbajo/SKILL.md)
