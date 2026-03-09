# AGENTS.md

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

## Available skills for this context

- WorktreeDerAbajo: Abrir o crear el worktree fijo del monitor derecho inferior.
  (file: C:/Users/Lisandro/.codex/skills/workflow-WorktreeDerAbajo/SKILL.md)
- WorktreeDerArriba: Abrir o crear el worktree fijo del monitor derecho superior.
  (file: C:/Users/Lisandro/.codex/skills/workflow-WorktreeDerArriba/SKILL.md)
- WorktreeIzqArriba: Abrir o crear el worktree fijo del monitor izquierdo superior.
  (file: C:/Users/Lisandro/.codex/skills/workflow-WorktreeIzqArriba/SKILL.md)
- WorktreeIzqAbajo: Abrir o crear el worktree fijo del monitor izquierdo inferior.
  (file: C:/Users/Lisandro/.codex/skills/workflow-WorktreeIzqAbajo/SKILL.md)

