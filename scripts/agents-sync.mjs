import { syncAgentMirrors } from "./agents-sync-lib.mjs";

let sourceName = "";

for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];

  if (argument === "--source" && process.argv[index + 1]) {
    sourceName = process.argv[index + 1];
    index += 1;
    continue;
  }

  if (argument.startsWith("--source=")) {
    sourceName = argument.slice("--source=".length);
    continue;
  }

  throw new Error(`Unknown argument '${argument}'.`);
}

const result = syncAgentMirrors({ sourceName });
const summary =
  result.writtenNames.length > 0
    ? `Synced ${result.writtenNames.join(", ")} from ${result.sourceName}.`
    : `Agent mirrors already synchronized from ${result.sourceName}.`;

console.log(summary);
