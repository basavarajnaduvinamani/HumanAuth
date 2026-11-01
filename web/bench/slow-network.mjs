import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const base = process.env.BASE_URL || "http://127.0.0.1:3003",
  browser = await chromium.launch(),
  context = await browser.newContext(),
  page = await context.newPage();
const cdp = await context.newCDPSession(page);
page.on("pageerror", (error) => console.log("pageerror", error.message));
page.on("requestfailed", (request) => console.log("requestfailed", request.url().split("?")[0], request.failure()));
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 150,
  downloadThroughput: 204800,
  uploadThroughput: 96000,
  connectionType: "cellular3g",
});
const results = [];
for (const visit of ["first", "second"]) {
  const requests = [];
  const handler = (r) => {
    if (new URL(r.url()).pathname.startsWith("/models/"))
      requests.push(r.url().split("?")[0]);
  };
  page.on("request", handler);
  const start = performance.now();
  await page.goto(`${base}/verify?sample=1`);
  await page
    .getByRole("heading", { name: "Not verified", exact: true })
    .waitFor({ timeout: 600000 });
  const elapsed_ms = performance.now() - start;
  results.push({
    visit,
    elapsed_ms,
    model_network_requests: requests.length,
    model_files: requests,
  });
  page.off("request", handler);
  console.log(visit, elapsed_ms, requests.length);
}
await writeFile(
  "../bench/results/web_slow_network.json",
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      browser: browser.version(),
      profile: {
        name: "Fast 3G (explicit CDP profile)",
        latency_ms: 150,
        download_bytes_per_second: 204800,
        upload_bytes_per_second: 96000,
      },
      boundary:
        "Navigation to complete sample result; first and second visits in the same browser context. Second visit retains model Cache Storage.",
      results,
    },
    null,
    2,
  ) + "\n",
);
await browser.close();
