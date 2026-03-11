# AGENTS.md

## Scope, Priority, and Portability

This file is the canonical agent operating contract for this repository. It is designed so it can be copied to other repositories as a portable base:

1. Universal rules are first and apply to any project.
2. Project-specific contracts are in the final section and only apply to this project.
3. In case of conflict, universal rules have higher priority.
4. The mirror requirement for repo-root files (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`) must be preserved exactly.

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
4. If the three files diverge ambiguously, reconcile the most complete and
   up-to-date version first, then replicate that reconciled result to all three.
5. Use `npm run agents:sync` to mirror the triplet and `npm run agents:verify`
   or `npm run verify` to enforce that the three files match exactly.

## ⚠️ WORKTREE OBLIGATORIO (sin excepción)

1. All agent work **must use a dedicated worktree**.
2. `main` is read-only for agent coding operations.
3. It is forbidden to read, edit, run mutating actions, or commit on `main`.
4. If the current context is on `main`, the agent must stop mutating work and
   require an immediate switch/creation of a worktree.
5. Every session begins with worktree validation.

### Quick gate check (mandatory)

Before any mutating action, execute:

```powershell
$current = git branch --show-current
if ($current -eq "main") { throw "WORKTREE_REQUIRED: main is forbidden. Switch to/create a worktree before editing." }
```

If the gate is in `main`, no repository-changing commands are permitted.

## 👤 IDENTITY

1. The agent operates as an execution partner for this repository.
2. The agent prioritizes correctness, continuity, and maintainability.
3. Truth, traceability, and explicit constraints are mandatory.

## ⚖️ PRINCIPLES

1. Never hide uncertainty: if something is unknown, say it explicitly.
2. Preserve compatibility and intent of existing product behavior.
3. Prefer explicit steps over clever shortcuts.
4. Maintain clean, minimal, and reversible changes.

## 🛠️ TECHNICAL RULES

1. UTF-8 is mandatory for all tracked text files in the repo.
2. Use `-Encoding utf8` in shell writes that generate or modify text files.
3. Keep `main` as reference branch and isolate work to worktrees.
4. Keep public exports minimal and scoped.
5. Preserve low coupling and context-local reasoning in changes.

### Work directories

If the repository uses temporary agent files, they should go to a dedicated
agent workspace in the repo (preferably `/.agent/0. Agents Brain/...`) unless a
project explicitly defines another convention.

## ⚠️ MAKE NO MISTAKES PROTOCOL

1. Verify facts, file paths, and assumptions before acting.
2. Prefer accuracy over speed.
3. If uncertain, state uncertainty and stop before destructive changes.
4. Use explicit reasoning for risky or high-impact modifications.

## 💬 COMMUNICATION STYLE

1. Be concise and direct.
2. Prefer decision-relevant information first.
3. Remove filler language.
4. State assumptions and risks explicitly.

## 🧠 HALLUCINATION PREVENTION

1. Before suggesting new dependencies, inspect existing declarations first.
2. Prefer already-installed or pre-approved tools and versions.
3. Do not invent APIs or commands.

## ✅ TASK COMPLETION

1. Keep a visible completion state and close tasks with explicit done markers.
2. Validate that all required commands and checks are executed before finalizing.

## 🧪 E2E TEST EXECUTION

1. For projects using Playwright, prefer headless execution.
2. Typical command pattern: `npx playwright test --workers=5` (or project default).
3. Add environment/timeouts/parallelism according to project policy.

## 💾 MEMORY (Standardized Coordination Protocol)

Use Engram when available.

1. `project`: use the canonical project name (for example `{{PROJECT_NAME}}`).
2. `mem_session_start` at session start with directory context.
3. `mem_save` for decisions, blockers, and pivots.
4. `mem_session_summary` at completion of a substantial session.
5. `mem_session_end` as the terminal closure action when the session started with `mem_session_start`.

Available commands:

- `mem_session_start`
- `mem_save`
- `mem_save_prompt`
- `mem_search`
- `mem_context`
- `mem_session_summary`
- `mem_session_end`
- `mem_stats`
- `mem_timeline`
- `mem_get_observation`

## 🧠 SEQUENTIAL THINKING

Use structured reasoning for complex tasks involving:

1. multi-hypothesis debugging,
2. architectural trade-offs,
3. ambiguous failures,
4. high-risk refactors.

When used, state thought progression explicitly.

## 🌿 GIT WORKFLOW

1. `main` is reference only; all code changes occur in worktrees.
2. Initialize work from the selected worktree.
3. Keep changes isolated per session.
4. Any mutating task completed without worktree context is non-compliant.

## 🖥️ EJECUCIÓN NO INTRUSIVA

1. Use background/minimized execution for long-running agent scripts by default.
2. Avoid foreground terminal pops during automation.
3. Prefer logging to repo agent workspace when applicable.

## 🔒 REPO PRIVADO — GITHUB SIN NAVEGADOR

When the repository is private, do not use browser automation against GitHub web UI.
Use `gh` CLI or GitHub MCP tools as the verification path.

## 🌐 MCP SERVERS (Ecosystem)

Preferred MCP usage:

- `engram`: long-term memory and execution continuity.
- `github`: pull request, issue, commit, and repository metadata.
- `devctx`: local topology/context snapshots.
- `context7`: docs and API references.
- `chrome-devtools`: UI/runtime investigation when relevant.
- `playwright`: browser automation and regression checks.
- `ripgrep`: fast repository search and discovery.

This section is a catalog; commands are executed only when available and relevant.

## Project-Specific Contracts

The section below applies only to this repository and should be adjusted when copying
to another project.

### Critical Global Auto-Booster Contract

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

### Global Host Access Contract

The `All Sites / All Tabs` lane relies on install-time `host_permissions`
for `"<all_urls>"` in `public/manifest.json`.

1. Keep `"<all_urls>"` in `host_permissions`, not `optional_host_permissions`,
   unless explicitly redefined by user request.
2. Do not add an `onInstalled` permission-request flow.
3. Keep `REQUEST_GLOBAL_PERMISSION` and `chrome.permissions.request(...)` as
   recovery only.
4. Preserve the worker bootstrap downgrade that turns persisted global mode back
   to `off` when effective all-sites access is missing.
5. Before shipping changes touching this contract, run:
   `npm test -- src/worker/auto-booster-client.test.ts src/worker/orchestrator.behavior.test.ts src/automation/main.test.ts src/shared/manifest-permissions.test.ts`
   `npm run build`

### i18n Readiness Contract

1. Add or rename message keys only in
   `public/_locales/en/messages.json`, then regenerate artifacts with
   `npm run i18n:generate`.
2. Do not place visible fallback copy inline in TypeScript or HTML.
3. Runtime fallback for user-facing text must resolve through
   `src/shared/runtime-i18n.ts` / `src/content/runtime-api.ts` from generated
   English catalog.
4. Keep user-visible strings outside localized pipelines only when justified by
   policy.
5. Before shipping i18n changes, run:
   `npm run i18n:generate`
   `npm run i18n:check`
   `npm run i18n:audit`
   `npm run verify`

Reference:
- `docs/i18n/README.md`
- `docs/i18n/glossary.md`
- `docs/i18n/locale-onboarding.md`

### Hyper-Modular Structure Contract

1. No file may exceed `150 LOC`.
2. No file may contain more than `1 function`.
3. If a change would push a file above `150 LOC`, split before shipping.
4. If a change requires additional functions, extract into separate files.
5. Enforce across product code, tests, scripts, and supporting modules unless
   user explicitly asks otherwise.

### AI-Agent Long-Term Evolution Contract

1. Favor modularity and minimal public surface.
2. Separate data, types, constants, computations, validation, mappings, and
   composition into distinct modules.
3. Keep stable domain facades; avoid deep internal cross-import usage.
4. Export only what production code needs.
5. Prefer explicit, one-purpose modules and small, predictable files.

## Available skills for this context

- WorktreeDerAbajo: Abrir o crear el worktree fijo del monitor derecho inferior.
  (file: C:/Users/Lisandro/.codex/skills/workflow-WorktreeDerAbajo/SKILL.md)
- WorktreeDerArriba: Abrir o crear el worktree fijo del monitor derecho superior.
  (file: C:/Users/Lisandro/.codex/skills/workflow-WorktreeDerArriba/SKILL.md)
- WorktreeIzqArriba: Abrir o crear el worktree fijo del monitor izquierdo superior.
  (file: C:/Users/Lisandro/.codex/skills/workflow-WorktreeIzqArriba/SKILL.md)
- WorktreeIzqAbajo: Abrir o crear el worktree fijo del monitor izquierdo inferior.
  (file: C:/Users/Lisandro/.codex/skills/workflow-WorktreeIzqAbajo/SKILL.md)
