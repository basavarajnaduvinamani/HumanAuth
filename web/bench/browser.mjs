import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import { synthesize } from "../../scripts/synthetic/synthesize.mjs";
const base = process.env.BASE_URL || "http://127.0.0.1:3002",
  browser = await chromium.launch();
const originals = await Promise.all(
  [readFile("public/samples/synthetic-face-a.png"),
   readFile("public/samples/document.png"),
   synthesize("This is a synthetic sample phrase for local testing.", "slt")],
);
async function open() {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    const Native = window.Worker;
    window.__qaResults = [];
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args);
        window.__qaWorker = this;
        this.addEventListener("message", (e) => {
          if (e.data.type === "result") window.__qaResults.push(e.data.result);
        });
      }
    };
  });
  await page.goto(`${base}/verify?sample=1`);
  await page
    .getByRole("heading", { name: "Not verified", exact: true })
    .waitFor({ timeout: 180000 });
  return page;
}
const cold = [];
let page;
const parityOnly = process.env.PARITY_ONLY === "1";
for (let i = 0; i < (parityOnly ? 1 : 3); i++) {
  page = await open();
  cold.push(await page.evaluate(() => window.__qaResults));
  if (!parityOnly && i < 2) await page.close();
}
let id = 10000;
async function invoke(name, bytes) {
  return page.evaluate(
    ({ name, data, id }) =>
      new Promise((resolve, reject) => {
        const worker = window.__qaWorker,
          handler = (e) => {
            if (e.data.id !== id) return;
            if (e.data.type === "result") {
              worker.removeEventListener("message", handler);
              resolve(e.data.result);
            }
            if (e.data.type === "error") {
              worker.removeEventListener("message", handler);
              reject(Error(e.data.message));
            }
          };
        worker.addEventListener("message", handler);
        const bytes = new Uint8Array(data).buffer;
        worker.postMessage({ id, name, bytes, claimed: "Sample speaker A" }, [bytes]);
      }),
    { name, data: Array.from(bytes), id: ++id },
  );
}
const warm = [];
for (let i = 0; i < (parityOnly ? 0 : 30); i++) {
  const rows = [];
  for (const [j, n] of ["face", "document", "voice"].entries())
    rows.push(await invoke(n, originals[j]));
  warm.push(rows);
  console.log("warm", i + 1);
}
const quantile = (a, p) => {
  const s = [...a].sort((a, b) => a - b),
    pos = ((s.length - 1) * p) / 100,
    lo = Math.floor(pos);
  return s[lo] + (s[Math.ceil(pos)] - s[lo]) * (pos - lo);
};
const stages = parityOnly ? {} : Object.fromEntries(
  ["face", "document", "voice", "total"].map((n) => {
    const v = warm.map((row) =>
      n === "total"
        ? row.reduce((s, r) => s + r.latency_ms, 0)
        : row.find((r) => r.name === n).latency_ms,
    );
    return [
      n,
      {
        p50_ms: quantile(v, 50),
        p95_ms: quantile(v, 95),
        backend:
          n === "total" ? "mixed" : warm[0].find((r) => r.name === n).backend,
      },
    ];
  }),
);
const output = {
  generated_at: new Date().toISOString(),
  command: "cd web && node bench/browser.mjs",
  hardware: {
    cpu: os.cpus()[0].model,
    logical_cores: os.cpus().length,
    ram_bytes: os.totalmem(),
    os: `${os.type()} ${os.release()}`,
    browser: browser.version(),
  },
  boundary:
    "Worker stage includes decode, preprocessing and inference. Cold includes model fetch/session initialization. Warm retains worker and sessions. Total is sum of stage compute, excluding page render and capture.",
  inputs: "AI-generated fictional face A, code-generated SPECIMEN card, locally generated Flite speech. Synthetic fixture timing, not visitor accuracy or physical-camera latency.",
  warm_runs: 30,
  cold_runs: 3,
  stages,
  cold,
  warm,
};
const name = `web_latency_i5_12450h_${new Date().toISOString().replace(/[:.]/g, "-")}`;
if (!parityOnly) {
await writeFile(
  `../bench/results/${name}.json`,
  JSON.stringify(output, null, 2) + "\n",
);
const md = [
  "# Browser latency",
  "",
  output.boundary,
  "",
  "| Stage | p50 ms | p95 ms | Backend |",
  "| --- | ---: | ---: | --- |",
  ...Object.entries(stages).map(
    ([n, r]) => `| ${n} | ${r.p50_ms} | ${r.p95_ms} | ${r.backend} |`,
  ),
  "",
  `Warm runs: 30. Cold runs: 3. Browser: ${browser.version()}.`,
  JSON.stringify(output.hardware),
].join("\n");
await writeFile(`../bench/results/${name}.md`, md + "\n");
await writeFile(
  "../bench/results/web_latency_latest.json",
  JSON.stringify({ source: `bench/results/${name}.json`, ...output }, null, 2) +
    "\n",
);
}
// Browser qualification runs the same selected models and shared code on
// lossless encodings of the exact Python reference RGB/PCM fixtures.
const refs = JSON.parse(
    await readFile("../.overnight/parity-v2/references.json", "utf8"),
  ),
  rows = [];
for (const r of refs.rows) {
  const bytes = await readFile(
      `../.overnight/parity-v2/${r.id}.${r.modality === "voice" ? "wav" : "png"}`,
    ),
    ts = await invoke(r.modality, bytes);
  rows.push({
    id: r.id,
    modality: r.modality,
    python_score: r.python.score,
    browser_score: ts.score,
    abs_diff: Math.abs(r.python.score - ts.score),
    same_pass_fail: r.python.passed === ts.passed,
    backend: ts.backend,
  });
}
const gate = Object.fromEntries(
  ["face", "document", "voice"].map((n) => {
    const r = rows.filter((r) => r.modality === n),
      max = Math.max(...r.map((r) => r.abs_diff));
    return [
      n,
      {
        mode: r.every((r) => r.same_pass_fail) && max <= 0.02 ? "GO" : "REPLAY",
        max_abs_diff: max,
        cases: r.length,
      },
    ];
  }),
);
await writeFile(
  "../bench/results/web_browser_parity.json",
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      browser: browser.version(),
      hardware: output.hardware,
      gate,
      rows,
      scope:
        "Headless Chromium worker, PNG/WAV encodings of Python reference fixtures. This qualifies only the observed backends; not all devices.",
    },
    null,
    2,
  ) + "\n",
);
console.log(gate);
await browser.close();
if (Object.values(gate).some((g) => g.mode !== "GO" || g.cases < 11))
  throw Error("Browser parity gate failed");
