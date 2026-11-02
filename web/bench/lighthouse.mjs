import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.BASE_URL || "http://127.0.0.1:3003";
const label = process.env.LIGHTHOUSE_AUDIT_LABEL;
assert.ok(label === undefined || label === "production");
const outputName = label === "production" ? "lighthouse-production" : "lighthouse";
await mkdir(`../bench/results/${outputName}`, { recursive: true });
const summary = [];
const cookies = JSON.parse(process.env.VERCEL_PREVIEW_COOKIE || "[]");
assert.ok(Array.isArray(cookies));
for (const cookie of cookies) {
  assert.equal(new URL(cookie.url).origin, new URL(base).origin);
  assert.equal(typeof cookie.name, "string");
  assert.equal(typeof cookie.value, "string");
}
const redact = (text) => cookies.reduce(
  (clean, cookie) => clean.split(cookie.value).join("[redacted]"), text);
for (const formFactor of ["mobile", "desktop"])
  for (const route of ["/", "/verify", "/evidence"]) {
    // Use the same Playwright headless shell as the passing screenshot/e2e runs.
    // Full Chrome on this Windows host returned NO_FCP during the first audit.
    const chrome = await chromium.launch({
      args: ["--remote-debugging-port=9231"],
    });
    try {
      if (cookies.length) {
        // Default CDP context is the one Lighthouse uses. No browser profile or
        // cookie state is persisted, and credentials never become CLI arguments.
        const session = await chrome.newBrowserCDPSession();
        await session.send("Storage.setCookies", { cookies });
        await session.detach();
      }
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
          disableStorageReset: cookies.length > 0,
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
      assert.equal(new URL(output.lhr.finalDisplayedUrl).origin, new URL(base).origin,
        "Lighthouse must audit the application rather than a protection redirect");
      assert.equal(new URL(output.lhr.finalDisplayedUrl).pathname, route);
      await writeFile(`../bench/results/${outputName}/${filename}`, redact(output.report));
      const row = {
        page: route,
        form_factor: formFactor,
        source: `bench/results/${outputName}/${filename}`,
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
  `../bench/results/${outputName}/summary.json`,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      base_url: base,
      storage_reset: cookies.length === 0,
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
