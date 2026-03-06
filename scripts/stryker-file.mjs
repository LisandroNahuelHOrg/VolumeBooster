import path from "node:path";
import { spawn } from "node:child_process";

const requestedFile = process.argv[2];

if (!requestedFile) {
  console.error('Usage: npm run test:mutate:file -- "src/path/to/file.ts"');
  process.exit(1);
}

const normalized = requestedFile.replace(/\\/g, "/");

if (!normalized.startsWith("src/") || !normalized.endsWith(".ts")) {
  console.error("Only source TypeScript files under src/ can be mutated.");
  process.exit(1);
}

if (
  normalized.endsWith(".test.ts") ||
  normalized.includes("/__tests__/") ||
  normalized.includes("/generated/") ||
  normalized.endsWith("/main.ts") ||
  normalized.includes("/types/")
) {
  console.error(`File is excluded from mutation: ${normalized}`);
  process.exit(1);
}

await new Promise((resolve, reject) => {
  const child = spawn(process.platform === "win32" ? "npx stryker run" : "npx", process.platform === "win32" ? [] : ["stryker", "run"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      STRYKER_MUTATE: path.normalize(normalized).replace(/\\/g, "/")
    }
  });

  child.on("close", (code) => {
    if (code === 0) {
      resolve();
      return;
    }

    reject(new Error(`Stryker file run failed with exit code ${code}`));
  });
});
