import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.BASE_URL || "http://127.0.0.1:3003";
const browser = await chromium.launch(),
  page = await browser.newPage();
await mkdir("screenshots", { recursive: true });
const files = [];
for (const width of [1440, 390])
  for (const theme of ["light", "dark"])
    for (const route of [
      "/",
      "/verify",
      "/how-it-works",
      "/evidence",
      "/about",
      "/use-cases",
      "/404",
    ]) {
      await page.setViewportSize({
        width,
        height: width === 1440 ? 1000 : 844,
      });
      await page.goto(`${base}${route}`);
      await expect(
        page.getByRole("button", { name: "Theme: toggle dark theme" }),
      ).toBeEnabled();
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
      }, theme);
      await page.evaluate(() => document.fonts.ready);
      const file = `screenshots/${route === "/" ? "landing" : route.slice(1)}-${width}-${theme}.png`;
      await page.screenshot({ path: file, fullPage: true });
      files.push(file);
    }
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${base}/verify`);
await page.getByRole("checkbox").check();
await page.getByRole("button", { name: "Continue", exact: false }).click();
await page.screenshot({
  path: "screenshots/verify-face-phone.png",
  fullPage: true,
});
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(`${base}/verify?sample=1`);
await page
  .getByRole("heading", { name: "Not verified", exact: true })
  .waitFor({ timeout: 180000 });
await page.screenshot({
  path: "screenshots/result-rejected-desktop.png",
  fullPage: true,
});
await page.locator(".result-sheet").screenshot({ path: "public/og.png" });
await writeFile(
  "screenshots/index.json",
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      files: [
        ...files,
        "screenshots/verify-face-phone.png",
        "screenshots/result-rejected-desktop.png",
      ],
      verified_screenshot:
        "Not produced: the fixed bundled SPECIMEN is rejected. No fabricated approval.",
    },
    null,
    2,
  ),
);
await browser.close();
