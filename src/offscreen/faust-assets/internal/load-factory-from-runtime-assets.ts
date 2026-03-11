import type { LooseFaustDspFactory } from "@grame/faustwasm";
import { parseCompileOptions } from "./parse-compile-options";

type RuntimeAssetPaths = {
  wasm: string;
  json: string;
};

export async function loadFactoryFromRuntimeAssets(
  paths: RuntimeAssetPaths
): Promise<Required<LooseFaustDspFactory>> {
  const wasmUrl = chrome.runtime.getURL(paths.wasm);
  const jsonUrl = chrome.runtime.getURL(paths.json);
  const [wasmResponse, jsonResponse] = await Promise.all([fetch(wasmUrl), fetch(jsonUrl)]);

  if (!wasmResponse.ok) {
    throw new Error(`Faust WASM asset could not be loaded: ${wasmUrl}`);
  }

  if (!jsonResponse.ok) {
    throw new Error(`Faust metadata asset could not be loaded: ${jsonUrl}`);
  }

  const [wasmBuffer, json] = await Promise.all([wasmResponse.arrayBuffer(), jsonResponse.text()]);
  const code = new Uint8Array(wasmBuffer);
  const module = await WebAssembly.compile(code);
  const compileOptions = parseCompileOptions(json);

  return {
    cfactory: 0,
    code,
    module,
    json,
    poly: compileOptions.includes("wasm-e"),
    shaKey: "",
    soundfiles: {}
  };
}
