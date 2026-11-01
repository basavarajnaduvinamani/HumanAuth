import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.BASE_URL || "http://127.0.0.1:3003";
await mkdir("../bench/results/lighthouse", { recursive: true });
const summary = [];
for (const formFactor of ["mobile", "desktop"])
  for (const route of ["/", "/verify", "/evidence"]) {
    // Use the same Playwright headless shell as the passing screenshot/e2e runs.
    // Full Chrome on this Windows host returned NO_FCP during the first audit.
    const chrome = await chromium.launch({
      args: ["--remote-debugging-port=9231"],
    });
    try {
      const output = await lighthouse(
        base + route,
        {
          port: 9231,
          output: "json",
          onlyCategories: [
            "performance",
            "accessibility",
            "best-practices",
            "seo",
          ],
          formFactor,
          screenEmulation:
            formFactor === "desktop"
              ? {
                  mobile: false,
                  width: 1440,
                  height: 1000,
                  deviceScaleFactor: 1,
                  disabled: false,
                }
              : undefined,
        },
        formFactor === "desktop" ? desktopConfig : undefined,
      );
      if (!output) throw Error("Lighthouse returned no report");
      if (output.lhr.runtimeError) throw Error(output.lhr.runtimeError.message);
      const filename = `${route === "/" ? "landing" : route.slice(1)}-${formFactor}.json`;
      await writeFile(`../bench/results/lighthouse/${filename}`, output.report);
      const row = {
        page: route,
        form_factor: formFactor,
        source: `bench/results/lighthouse/${filename}`,
        scores: Object.fromEntries(
          Object.entries(output.lhr.categories).map(([k, v]) => [
            k,
            Math.round(v.score * 100),
          ]),
        ),
        browser: output.lhr.environment.hostUserAgent,
        fetch_time: output.lhr.fetchTime,
      };
      summary.push(row);
      console.log(JSON.stringify(row));
    } finally {
      await chrome.close();
    }
  }
await writeFile(
  "../bench/results/lighthouse/summary.json",
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      command: "node_modules/node/bin/node bench/lighthouse.mjs",
      results: summary,
    },
    null,
    2,
  ) + "\n",
);
if (
  summary.some(
    (r) => r.scores.accessibility < 90 || r.scores["best-practices"] < 90,
  )
)
  process.exitCode = 1;
