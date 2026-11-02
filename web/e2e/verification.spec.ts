import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import manifest from "../public/models/manifest.json";
test.beforeEach(async ({ context }) => {
  if (process.env.VERCEL_PREVIEW_COOKIE) {
    try {
      const origin = new URL(process.env.BASE_URL || "http://127.0.0.1:3000")
        .origin;
      const parsed: unknown = JSON.parse(process.env.VERCEL_PREVIEW_COOKIE);
      if (!Array.isArray(parsed) || !parsed.length) throw Error();
      const cookies = parsed.map((entry: unknown) => {
        if (!entry || typeof entry !== "object") throw Error();
        const cookie = entry as Record<string, unknown>;
        if (
          typeof cookie.url !== "string" ||
          new URL(cookie.url).origin !== origin ||
          typeof cookie.name !== "string" ||
          typeof cookie.value !== "string"
        )
          throw Error();
        return {
          url: origin + "/",
          name: cookie.name,
          value: cookie.value,
          httpOnly: true,
          secure: true,
          sameSite: "Lax" as const,
        };
      });
      await context.addCookies(cookies);
    } catch {
      throw Error(
        "Protected preview cookie setup failed; diagnostics suppressed.",
      );
    }
    return;
  }
  const token = process.env.VERCEL_OIDC_TOKEN;
  if (!token) return;
  const origin = new URL(process.env.BASE_URL || "http://127.0.0.1:3000")
    .origin;
  const bootstrap = await context.request.get(origin + "/", {
    headers: { "x-vercel-trusted-oidc-idp-token": token },
    maxRedirects: 0,
  });
  expect(bootstrap.status()).toBe(200);
  const policy = bootstrap.headers()["content-security-policy"] || "";
  for (const directive of [
    "connect-src 'self'",
    "worker-src 'self'",
    "script-src 'self'",
  ])
    expect(policy).toContain(directive);
  await bootstrap.dispose();
  // Nested module workers bypass request routing in Playwright. Context headers
  // cover them; the origin allowlist and same-origin worker CSP bound the scope.
  await context.setExtraHTTPHeaders({
    "x-vercel-trusted-oidc-idp-token": token,
  });
  await context.route("**/*", async (route) => {
    const request = route.request();
    if (new URL(request.url()).origin !== origin) {
      await route.abort("blockedbyclient");
      return;
    }
    const headers = { ...request.headers() };
    delete headers["x-vercel-trusted-oidc-idp-token"];
    if (new URL(request.url()).origin === origin)
      headers["x-vercel-trusted-oidc-idp-token"] = token;
    try {
      // Resolve each redirect separately so credentials remain origin-scoped.
      const response = await route.fetch({ headers, maxRedirects: 0 });
      await route.fulfill({ response });
    } catch {
      // Never include secret-bearing fetch diagnostics in test logs or traces.
      await route.abort("failed");
    }
  });
});
test("server-rendered controls wait for hydration before accepting input", async ({
  page,
}) => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/_next/static/**/*.js", async (route) => {
    await ready;
    await route.continue();
  });
  try {
    await page.goto("/verify", { waitUntil: "commit" });
    const sample = page.getByRole("button", {
      name: "Use sample data",
      exact: false,
    });
    await expect(sample).toBeDisabled();
    await expect(page.getByRole("checkbox")).toBeDisabled();
    release();
    await expect(sample).toBeEnabled();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continue", exact: false }).click();
    await expect(
      page.getByRole("heading", { name: "Is a live face present?" }),
    ).toBeVisible();
  } finally {
    release();
  }
});
test("sample flow, receipt, privacy and accessibility", async ({
  page,
  browser,
}, testInfo) => {
  const requests: {
    path: string;
    method: string;
    request_body_bytes: number;
    origin: string;
    static_query: boolean;
    media_content_type: boolean;
  }[] = [];
  const base = process.env.BASE_URL || "http://127.0.0.1:3000";
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (url.protocol.startsWith("http"))
      requests.push({
        path: url.pathname,
        origin: url.origin,
        method: r.method(),
        request_body_bytes: r.postDataBuffer()?.byteLength || 0,
        static_query: Array.from(url.searchParams).every(
          ([key, value]) =>
            (key === "_rsc" && value.length <= 80) ||
            (key === "sha256" &&
              manifest.models.some((model) => model.sha256 === value)) ||
            (["sample", "camera"].includes(key) && value === "1"),
        ),
        media_content_type: /^(image\/|audio\/|multipart\/)/i.test(
          r.headers()["content-type"] || "",
        ),
      });
  });
  await page.goto("/");
  await page.getByRole("link", { name: "Try it with sample data" }).click();
  await page.waitForURL("**/verify?sample=1");
  await expect(
    page.getByRole("heading", { name: "Not verified", exact: true }),
  ).toBeVisible({ timeout: 180000 });
  await expect(
    page.getByText("Document check failed:", { exact: false }),
  ).toBeVisible();
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact || ""),
    ),
  ).toEqual([]);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download receipt (JSON)" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const body = JSON.parse(Buffer.concat(chunks).toString());
  expect(JSON.stringify(body)).not.toMatch(/\b(?:Pushpa|Thriveni|Sahana|Raj|Navya|Damodar|Girisha?)\b|Uday[\s_-]*Kumar/iu);
  expect(body.decision).toBe("reject");
  expect(body.checks).toHaveLength(3);
  expect(
    body.checks.every(
      (r: { mode: string; status: string }) =>
        r.mode === "live" && r.status === "ok",
    ),
  ).toBe(true);
  expect(
    body.models.every((m: { sha256: string }) => m.sha256.length === 64),
  ).toBe(true);
  expect(body.checks[0].passed).toBe(true);
  expect(body.checks[1].passed).toBe(false);
  expect(body.checks[2].passed).toBe(true);
  for (const check of body.checks) {
    if (check.backend === "WASM") expect(check.wasm_threads).toBe(1);
  }
  expect(requests.filter((r) => r.origin !== new URL(base).origin)).toEqual([]);
  expect(
    requests.filter(
      (r) =>
        r.method !== "GET" ||
        r.request_body_bytes !== 0 ||
        !r.static_query ||
        r.media_content_type,
    ),
  ).toEqual([]);
  await mkdir("../bench/results", { recursive: true });
  const output = {
    generated_at: new Date().toISOString(),
    browser: browser.version(),
    project: testInfo.project.name,
    base_url: base,
    scope:
      "From landing navigation through full sample verification and receipt. Static same-origin GET requests only.",
    input_upload_bytes: 0,
    third_party_requests: 0,
    requests,
    axe_serious_critical: 0,
    decision: body.decision,
    checks: body.checks,
  };
  await writeFile(
    path.join(
      "..",
      "bench/results",
      `web_network_audit_${testInfo.project.name}.json`,
    ),
    JSON.stringify(output, null, 2) + "\n",
  );
  if (testInfo.project.name === "chromium")
    await writeFile(
      "../bench/results/web_network_audit.json",
      JSON.stringify(output, null, 2) + "\n",
    );
  await page.getByRole("button", { name: "Start over", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your device. Your choice." }),
  ).toBeVisible();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
});
test("camera permission denial and invalid uploads have designed errors", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: () =>
          Promise.reject(new DOMException("Denied", "NotAllowedError")),
      },
    });
  });
  await page.goto("/verify");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue", exact: false }).click();
  await page.getByRole("button", { name: "Open camera" }).click();
  await expect(page.locator(".error-banner")).toContainText(
    "Camera permission denied",
  );
  await page.locator("input[type=file]").setInputFiles({
    name: "too-large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(8 * 1024 * 1024 + 1),
  });
  await expect(page.locator(".error-banner")).toContainText(
    "Image is larger than 8 MB",
  );
  await page.locator("input[type=file]").setInputFiles({
    name: "wrong.png",
    mimeType: "image/png",
    buffer: Buffer.from("not a PNG"),
  });
  await expect(page.locator(".error-banner")).toContainText(
    "Unsupported image type",
  );
});
test("every page has no serious or critical accessibility violations at phone width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "/",
    "/verify",
    "/how-it-works",
    "/evidence",
    "/about",
    "/missing-page",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const audit = await new AxeBuilder({ page }).analyze();
    expect(
      audit.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact || ""),
      ),
      path,
    ).toEqual([]);
  }
});
test("model download failure offers a retry without uploading media", async ({
  page,
}) => {
  await page.route("**/models/yolov5s-face.onnx*", (route) => route.abort());
  await page.goto("/verify");
  await page
    .getByRole("button", { name: "Use sample data", exact: false })
    .click();
  await expect(page.locator(".error-banner")).toContainText(
    "Model download failed",
    { timeout: 30000 },
  );
  await expect(
    page.getByRole("button", { name: "Try the bundled sample" }),
  ).toBeEnabled();
});
test("missing camera and unsupported workers have actionable errors", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: () =>
          Promise.reject(new DOMException("Missing", "NotFoundError")),
      },
    });
    Object.defineProperty(window, "Worker", { value: undefined });
  });
  await page.goto("/verify");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue", exact: false }).click();
  await page.getByRole("button", { name: "Open camera" }).click();
  await expect(page.locator(".error-banner")).toContainText(
    "No camera is available",
  );
  await page
    .getByRole("button", { name: "Use face sample", exact: false })
    .click();
  await expect(page.locator(".error-banner")).toContainText(
    "does not support inference workers",
  );
});
