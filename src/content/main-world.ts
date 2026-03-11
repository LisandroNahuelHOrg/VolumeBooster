/**
 * @fileoverview Bridge experimental en MAIN world que intercepta conexiones de
 * Web Audio y publica estado/telemetría hacia el content script aislado.
 *
 * Guardrail crítico:
 * Este archivo alimenta el lane `All Sites / All Tabs` a través del registered
 * main-world content script. Debe permanecer como runtime side-effect-only.
 * No agregar top-level exports aquí. Una regresión previa rompió por completo
 * el modo global al cambiar la forma del módulo para exponer helpers de test.
 */
import { createMainWorldController } from "./main-world/internal/create-main-world-controller";
import { mainWorldTestables } from "./main-world/internal/main-world-testables";

const bridgeController = createMainWorldController();

if (import.meta.env.MODE === "test") {
  Object.defineProperty(window, "__PRISM_AUTO_BOOSTER_MAIN_WORLD_TESTABLES__", {
    value: mainWorldTestables,
    configurable: true
  });
}

if (!window.__PRISM_AUTO_BOOSTER_MAIN_WORLD_BOOTED__) {
  window.__PRISM_AUTO_BOOSTER_MAIN_WORLD_BOOTED__ = true;
  bridgeController.bootstrap();
}
