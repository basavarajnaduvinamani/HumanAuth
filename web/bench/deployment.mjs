import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const base = new URL(process.env.BASE_URL || "http://127.0.0.1:3008");
const label = process.env.AUDIT_LABEL || "local";
assert(["local", "preview", "production"].includes(label));
const token = process.env.VERCEL_OIDC_TOKEN;
const headers = token ? { "x-vercel-trusted-oidc-idp-token": token } : {};
const manifest = JSON.parse(
  await readFile("public/models/manifest.json", "utf8"),
);
async function get(path) {
  const url = new URL(path, base);
  assert.equal(url.origin, base.origin);
  // Fail on redirects rather than forwarding an origin-scoped credential.
  const response = await fetch(url, { headers, redirect: "error" });
  assert.equal(response.status, 200, `${path}: expected HTTP 200`);
  return response;
}
const root = await get("/");
const isolation = {
  coop: root.headers.get("cross-origin-opener-policy"),
  coep: root.headers.get("cross-origin-embedder-policy"),
  permissions: root.headers.get("permissions-policy"),
};
assert.equal(isolation.coop, "same-origin");
assert.equal(isolation.coep, "require-corp");
assert.match(isolation.permissions || "", /camera=\(self\)/);
const publicOrigin = new URL(process.env.PUBLIC_SITE_URL || "https://humanauth-iota.vercel.app").origin;
const html = await root.text();
assert.ok(html.includes(`content="${publicOrigin}/og.png"`), "OG metadata must use the public production origin");
assert.ok((await (await get("/robots.txt")).text()).includes(`Sitemap: ${publicOrigin}/sitemap.xml`));
const sitemap = await (await get("/sitemap.xml")).text();
for (const route of ["", "/verify", "/how-it-works", "/evidence", "/about"])
  assert.ok(sitemap.includes(`<loc>${publicOrigin}${route}</loc>`));
const servedManifest = await (await get("/models/manifest.json")).json();
assert.deepEqual(servedManifest, manifest);
const models = [];
for (const entry of manifest.models) {
  const response = await get(`/models/${entry.file}?sha256=${entry.sha256}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  assert.equal(bytes.length, entry.size_bytes);
  assert.equal(sha256, entry.sha256);
  const cache_control = response.headers.get("cache-control");
  assert.match(cache_control || "", /max-age=31536000/);
  models.push({
    file: entry.file,
    bytes: bytes.length,
    sha256,
    cache_control,
    matches_manifest: true,
  });
}
const browser = await chromium.launch({
  args: [
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
  ],
});
let camera;
try {
  const context = await browser.newContext({ permissions: ["camera"] });
  if (token) {
    const policy = root.headers.get("content-security-policy") || "";
    for (const directive of [
      "connect-src 'self'",
      "worker-src 'self'",
      "script-src 'self'",
    ])
      assert.ok(policy.includes(directive));
    await context.setExtraHTTPHeaders(headers);
  }
  if (token)
    await context.route("**/*", async (route) => {
      const request = route.request();
      const scoped = new URL(request.url()).origin === base.origin;
      if (!scoped) {
        await route.abort("blockedbyclient");
        return;
      }
      const clean = { ...request.headers() };
      delete clean["x-vercel-trusted-oidc-idp-token"];
      try {
        const response = await route.fetch({
          headers: { ...clean, ...(scoped ? headers : {}) },
          maxRedirects: 0,
        });
        await route.fulfill({ response });
      } catch {
        await route.abort("failed");
      }
    });
  const page = await context.newPage();
  await page.goto(new URL("/verify", base).href);
  const capabilities = await page.evaluate(() => ({
    secure_context: isSecureContext,
    cross_origin_isolated: crossOriginIsolated,
    get_user_media: typeof navigator.mediaDevices?.getUserMedia === "function",
  }));
  assert.equal(capabilities.secure_context, true);
  assert.equal(capabilities.cross_origin_isolated, true);
  assert.equal(capabilities.get_user_media, true);
  const fakeVideo = await page.evaluate(async () =>
    (await navigator.mediaDevices.enumerateDevices()).some(
      (d) => d.kind === "videoinput" && /fake/i.test(d.label),
    ),
  );
  assert.equal(
    fakeVideo,
    true,
    "Synthetic camera must be present before capture",
  );
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue", exact: false }).click();
  await page.getByRole("button", { name: "Open camera", exact: true }).click();
  try {
    await page.waitForFunction(() => {
      const video = document.querySelector("video");
      return video && video.readyState >= 2 && video.videoWidth > 0;
    });
  } catch (error) {
    console.log(
      JSON.stringify({
        camera_alerts: await page.getByRole("alert").allTextContents(),
        video: await page.locator("video").evaluateAll((videos) =>
          videos.map((v) => ({
            ready: v.readyState,
            width: v.videoWidth,
            paused: v.paused,
            has_stream: !!v.srcObject,
          })),
        ),
      }),
    );
    throw error;
  }
  await page.evaluate(() => {
    window.__qaStream = document.querySelector("video").srcObject;
  });
  await page
    .getByRole("link", { name: "HumanAuth", exact: true })
    .first()
    .click();
  await page.waitForFunction(() =>
    window.__qaStream.getTracks().every((t) => t.readyState === "ended"),
  );
  camera = {
    ...capabilities,
    synthetic_stream_started: true,
    tracks_stopped_on_navigation: true,
    scope:
      "Native Chromium getUserMedia with a synthetic test-pattern device and granted permission. No physical camera, personal image or human permission-prompt interaction.",
  };
} finally {
  await browser.close();
}
const result = {
  generated_at: new Date().toISOString(),
  label,
  base_url: base.href,
  boundary:
    "Served manifest/model hashes and headers, isolated browser context and synthetic camera lifecycle. Does not replace the full sample-flow e2e suite.",
  isolation,
  metadata: { public_origin: publicOrigin, og_image_matches: true, robots_sitemap_matches: true, sitemap_pages_match: true },
  models,
  camera,
};
await writeFile(
  `../bench/results/web_deployment_${label}.json`,
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result));
