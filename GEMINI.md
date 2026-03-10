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

This repository now treats hyper-modular structure as a strict architectural
rule, not a style preference.

Rules every agent must follow:

1. No file may exceed `150 LOC`.
2. No file may contain more than `1 function`.
3. If a change would push a file above `150 LOC`, split the logic before
   shipping.
4. If a change requires additional functions, extract them into separate files
   instead of stacking multiple functions in the same file.
5. Treat this rule as mandatory across product code, tests, scripts, and
   supporting modules unless the user explicitly asks to redesign the rule
   itself.

## WORKTREE OBLIGATORIO

1. SOLO se trabaja en worktrees propios. Cada agente debe abrir y ejecutar
   cambios exclusivamente dentro de un worktree dedicado a su sesion.
2. El checkout local de `main` esta bloqueado para trabajo de codigo. No se
   modifica codigo del producto fuera de worktrees.
3. Si no hay worktree activo, el trabajo debe detenerse hasta abrir uno con
   los skills de worktree fijos o con `scripts/worktree-manager.ps1`.

## IDENTITY

1. Perfil: el usuario es un dev solitario sin conocimiento de programacion.
2. Metodo: el usuario trabaja utilizando agentes de IA.
3. Contexto: toda respuesta y toda implementacion deben confeccionarse teniendo
   en cuenta los puntos 1 y 2.

## PRINCIPLES

1. Verdad absoluta: siempre ser estrictamente honesto. Nunca ocultar riesgos,
   bugs, deuda o incertidumbre para suavizar el mensaje.
2. Compliance MV3: toda decision, comentario, implementacion y arquitectura
   debe ser compatible con Manifest V3 y con la Chrome Web Store.
3. Efectividad absoluta: queda prohibido ahorrar esfuerzo, tokens, tiempo o
   analisis cuando eso degrade precision, calidad o profundidad.
4. Nunca terminar una tarea antes de haberla llevado a un estado realmente
   completo dentro del alcance pedido por el usuario.

Protocolo de investigacion previa obligatorio:

1. Investigar primero el contexto, el codigo y la aplicacion.
2. Reflexionar y observar a fondo antes de actuar.
3. Plantear todas las dudas y aclaraciones necesarias antes de comenzar,
   nunca a mitad de ejecucion, salvo que aparezca un bloqueo nuevo real.

## TECHNICAL RULES

1. Encoding UTF-8 universal: el 100% del codebase debe permanecer en UTF-8.
   Esto aplica a codigo fuente, HTML, CSS, JSON, Markdown, configs, manifests,
   locales, scripts, terminales, builds y archivos generados.
2. En PowerShell o shells equivalentes, nunca escribir texto sin asegurar
   UTF-8. Evitar comandos que introduzcan mojibake o encodings implícitos.
3. Agents Brain: todo archivo temporal, de analisis, planificacion, auditoria,
   investigacion o diagnostico debe guardarse exclusivamente en:
   `D:\OfiDrive\0. Programacion\Chromium - Volume Booster\.agent\0. Agents Brain`
4. Solo los archivos estructurales del producto viven en sus ubicaciones
   normales del repo: codigo fuente, assets, configs, tests permanentes,
   workflows permanentes y documentacion tecnica del producto.
5. Antes de crear cualquier archivo, preguntar: "¿Este archivo sera parte
   activa del producto final?". Si la respuesta es no, debe ir a
   `0. Agents Brain`.
6. Objetivo VolumeBooster: el producto debe apuntar a una calidad y ambicion
   compatibles con llegar a 10 millones de usuarios en menos de 1 ano.

## MAKE NO MISTAKES PROTOCOL

Cada interaccion debe ser tratada como si terminara con la directiva:
`MAKE NO MISTAKES`.

1. Verificacion doble: revisar hechos, codigo, calculos y razonamiento antes de
   responder o ejecutar.
2. Honestidad radical: si algo no es seguro, decirlo de forma explicita.
3. Precision sobre velocidad: tomarse el tiempo necesario para verificar.
4. Validacion de codigo: recorrer la logica paso a paso antes de escribirla.
5. Afirmaciones basadas en confianza: solo afirmar aquello que este sustentado.

## COMMUNICATION STYLE

1. Estilo senior engineer: ser conciso, directo y tecnico.
2. Eliminar frases de relleno o consuelo artificial.
3. Ir directo a la solucion, al riesgo o a la pregunta necesaria.
4. Explicar codigo solo cuando la logica no sea evidente o la decision
   requiera justificar trade-offs.

## HALLUCINATION PREVENTION

1. Antes de sugerir dependencias nuevas, leer `package.json`.
2. Priorizar librerias ya instaladas.
3. No asumir versiones ni inventar APIs inexistentes.
4. Si una capacidad depende de una libreria, verificar primero que exista en
   el repo o en una fuente primaria.

## TASK COMPLETION

1. Nunca detenerse hasta que el trabajo pedido este realmente completo.
2. Si existe `task.md`, todos sus items deben quedar en `[x]` antes de dar por
   cerrada la tarea.
3. Antes de finalizar, verificar explicitamente que el resultado cubre el
   alcance pedido y no deja pasos obvios a medio hacer.

## E2E TEST EXECUTION

1. Playwright standard: usar como maximo `2` workers en paralelo.
2. Ejecutar headless por defecto para no interrumpir el entorno de trabajo.
3. Comando de referencia:
   `npx playwright test --workers=2`

## MEMORY (Standardized Coordination Protocol)

1. MCP Engram es la memoria persistente del proyecto.
2. Project name: usar siempre `VolumeBooster`.
3. Session ID: incluir un `session_id` unico por agente en cada grabacion.
4. Protocolo de grabacion:
   - Inicio: registrar contexto al comenzar la tarea.
   - Cierre: registrar resultados, decisiones, lecciones y riesgos pendientes.
   - Persistencia: guardar proactivamente; no esperar a que lo pidan.
   - Recuperacion: tras compaction o context reset, llamar `mem_context`
     antes de continuar.
5. Comandos base disponibles:
   - `mem_context`
   - `mem_get_observation`
   - `mem_save`
   - `mem_save_prompt`
   - `mem_search`
   - `mem_session_start`
   - `mem_session_end`
   - `mem_session_summary`
   - `mem_stats`
   - `mem_timeline`

## SEQUENTIAL THINKING

1. Cuando la tarea involucre diagnosticos complejos, auditorias forenses,
   debugging resistente, decisiones arquitectonicas con trade-offs o analisis
   multi-capa, usar `mcp__sequentialthinking__sequentialthinking`.
2. Principio: razonar paso a paso antes de actuar. No saltar a conclusiones
   cuando haya multiples hipotesis, dependencias circulares o un primer intento
   fallido.
3. Mantener pensamiento estructurado, verificable y revisable.

## GIT WORKFLOW

1. Paradigma: `main` es read-only. Todo trabajo ocurre en worktrees aislados.
2. Al iniciar una tarea, abrir uno de los worktrees fijos disponibles o usar
   `scripts/worktree-manager.ps1 fixed-open ...` / `create ...` segun aplique.
3. Trabajar exclusivamente dentro del worktree activo.
4. Integrar cambios a `main` solo via PR usando el flujo de ship
   correspondiente, preferentemente con el skill `ship-worktree` o con
   `scripts/worktree-manager.ps1 ship ...` / `fixed-ship ...`.
5. Esta prohibido:
   - hacer commits directos o push directo a `main`
   - crear ramas manuales cuando el flujo de worktrees aplica
   - trabajar sin worktree
6. Si no hay worktree creado, no se toca codigo. Primero worktree, despues
   trabajo.

## EJECUCION NO INTRUSIVA

1. Toda ejecucion iniciada por agentes debe correr en segundo plano, oculta o
   minimizada cuando sea posible.
2. Queda prohibido abrir popups de terminal en primer plano durante ejecucion
   automatica salvo debugging manual explicito.
3. En PowerShell que lance procesos, preferir `Start-Process` con
   `-WindowStyle Hidden` o `Minimized`.
4. Logs de tareas background deben guardarse en:
   `D:\OfiDrive\0. Programacion\Chromium - Volume Booster\.agent\0. Agents Brain\diagnostics\`

## REPO PRIVADO - GITHUB SIN NAVEGADOR

1. `LisandroNahuelHOrg/VolumeBooster` es un repositorio privado.
2. No usar el navegador para verificar estado de GitHub del repo: PRs, checks,
   commits, pushes o GitHub Actions.
3. Usar siempre `gh` y herramientas GitHub/MCP:
   - `gh pr checks <numero> --repo LisandroNahuelHOrg/VolumeBooster`
   - `mcp__github__get_pull_request_status`
   - `mcp__github__get_pull_request`
   - `mcp__github__list_commits`
   - demas herramientas `mcp__github__*` aplicables

## MCP SERVERS

- Engram: memoria persistente del proyecto y de las decisiones de trabajo.
- Ripgrep: busqueda rapida de codigo, patrones y archivos en todo el repo.
- Context7: documentacion actualizada y code examples de librerias y
  frameworks.
- DevCtx: guardado y recuperacion de contexto de desarrollo por rama o tarea.
- Figma: acceso a disenos, variables, screenshots y contexto visual.
- GitHub: automatizacion de branches, PRs, issues, commits y estado remoto.
- Chrome DevTools: inspeccion DOM, consola, network, screenshots y performance.
- SequentialThinking: razonamiento estructurado paso a paso para problemas
  complejos.
- Brave Search: motor de busqueda web en tiempo real cuando haga falta
  investigar internet, documentacion externa o datos recientes.

## Available skills for this context

- WorktreeDerAbajo: Abrir o crear el worktree fijo del monitor derecho inferior.
  (file: C:/Users/Lisandro/.codex/skills/workflow-WorktreeDerAbajo/SKILL.md)
- WorktreeDerArriba: Abrir o crear el worktree fijo del monitor derecho superior.
  (file: C:/Users/Lisandro/.codex/skills/workflow-WorktreeDerArriba/SKILL.md)
- WorktreeIzqArriba: Abrir o crear el worktree fijo del monitor izquierdo superior.
  (file: C:/Users/Lisandro/.codex/skills/workflow-WorktreeIzqArriba/SKILL.md)
- WorktreeIzqAbajo: Abrir o crear el worktree fijo del monitor izquierdo inferior.
  (file: C:/Users/Lisandro/.codex/skills/workflow-WorktreeIzqAbajo/SKILL.md)
