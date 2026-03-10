import { verifyAgentMirrors } from "./agents-verify-lib.mjs";

const result = verifyAgentMirrors();

console.log(`Verified identical mirrors: ${result.fileNames.join(", ")}.`);
