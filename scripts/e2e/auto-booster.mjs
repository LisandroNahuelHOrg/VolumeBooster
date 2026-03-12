import process from "node:process";
import { runAutoBoosterCli } from "./auto-booster/run/run-auto-booster-cli.mjs";

await runAutoBoosterCli(process.argv, process.env, process.cwd());
