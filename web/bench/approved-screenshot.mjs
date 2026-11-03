import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  await page.goto(process.env.BASE_URL || "http://127.0.0.1:3006");
  const markup = await readFile("../.overnight/approved-fixture.html", "utf8");
  await page.locator("main").evaluate((el, html) => {
    el.innerHTML = html;
  }, markup);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "screenshots/result-verified-fusion-illustration.png",
    fullPage: true,
  });
  const index = JSON.parse(await readFile("screenshots/index.json", "utf8"));
  index.verified_screenshot = "screenshots/result-verified-fusion-illustration.png: explicitly labelled fusion unit-test illustration; not model inference.";
  index.files = [...new Set([...index.files, "screenshots/result-verified-fusion-illustration.png"])];
  await writeFile("screenshots/index.json", JSON.stringify(index, null, 2) + "\n");
} finally {
  await browser.close();
}
