import vm from "node:vm";

export function executeLicenseScript(scriptSource, context) {
  return vm.runInNewContext(scriptSource, context, {
    timeout: 20_000
  });
}
