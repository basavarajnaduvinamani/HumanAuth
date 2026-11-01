import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
mkdirSync("../.overnight", { recursive: true });
const runs = [];
for (const name of ["typecheck", "lint", "test", "build"]) {
  const started_at = new Date().toISOString();
  const run = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", name],
    {
      shell: process.platform === "win32",
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const log = `../.overnight/web-${name}.log`;
  writeFileSync(log, (run.stdout || "") + (run.stderr || ""));
  runs.push({
    command: `npm run ${name}`,
    started_at,
    finished_at: new Date().toISOString(),
    exit_status: run.status,
    log,
    error: run.error?.message,
  });
  writeFileSync(
    "../.overnight/web-checks.json",
    JSON.stringify(runs, null, 2) + "\n",
  );
  if (run.status !== 0) {
    console.error((run.stdout || "") + (run.stderr || ""));
    process.exit(run.status || 1);
  }
}
console.log(JSON.stringify(runs, null, 2));
