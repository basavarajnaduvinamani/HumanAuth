// Managed, expiring viewer access for cross-browser QA. Credentials stay in RAM.
import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const base = new URL(process.env.BASE_URL);
const deployment = process.env.VERCEL_QA_DEPLOYMENT_ID;
assert.ok(deployment && /^dpl_[a-zA-Z0-9]+$/.test(deployment));
assert.equal(base.protocol, "https:");
const linked = JSON.parse(await readFile(".vercel/project.json", "utf8"));
const team = linked.orgId;
const cliRoot = path.join(process.env.APPDATA, "npm/node_modules/vercel");
const pkg = JSON.parse(
  await readFile(path.join(cliRoot, "package.json"), "utf8"),
);
const cli = path.resolve(cliRoot, pkg.bin.vercel);
const lookup = spawnSync(process.execPath, [cli, "api", `/v13/deployments/${deployment}?teamId=${team}`, "--method", "GET"],
  { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
if (lookup.status !== 0) throw Error("Cannot verify protected QA target ownership.");
const target = JSON.parse(lookup.stdout);
assert.equal(target.projectId, linked.projectId);
assert.equal(target.url, base.hostname);
assert.equal(target.readyState, "READY");
assert.equal(target.target ?? null, null, "Viewer access is restricted to previews");
const endpoint = `/aliases/${deployment}/protection-bypass?teamId=${team}`;
function api(body) {
  const result = spawnSync(
    process.execPath,
    [cli, "api", endpoint, "--method", "PATCH", "--input", "-"],
    {
      input: JSON.stringify(body),
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  if (result.status !== 0)
    throw Error(
      "Protected QA access API failed; credential-bearing diagnostics suppressed.",
    );
  return JSON.parse(result.stdout);
}
function findLinks(value, out = []) {
  if (!value || typeof value !== "object") return out;
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === "object" && child.scope === "shareable-link")
      out.push({ secret: key, ...child });
    else if (child && typeof child === "object") findLinks(child, out);
  }
  return out;
}
let secret;
let revoked = false;
let code = 1;
let cookieValues = [];
let credentialLeakDetected = false;
const started = new Date().toISOString();
try {
  const created = api({ ttl: 1800 });
  const candidates = findLinks(created).sort(
    (a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0),
  );
  if (!candidates.length)
    throw Error(
      "Share-link response had an unexpected schema; no credential printed.",
    );
  secret = candidates[0].secret;
  const url = new URL("/", base);
  url.searchParams.set("_vercel_share", secret);
  const response = await fetch(url, { redirect: "manual" });
  const cookies = response.headers.getSetCookie().map((line) => {
    const pair = line.split(";", 1)[0],
      equal = pair.indexOf("=");
    assert.ok(equal > 0);
    return {
      name: pair.slice(0, equal).trim(),
      value: pair.slice(equal + 1),
      url: base.href,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 1800,
    };
  });
  if (!cookies.length)
    throw Error("Expiring viewer access did not return a cookie.");
  cookieValues = cookies.map((c) => c.value);
  const env = {
    ...process.env,
    VERCEL_PREVIEW_COOKIE: JSON.stringify(cookies),
  };
  delete env.VERCEL_OIDC_TOKEN;
  const run = spawnSync(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test"],
    {
      env,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  const credentials = [secret, ...cookieValues].filter(Boolean);
  const scrub = (value) =>
    credentials.reduce(
      (text, item) => text.split(item).join("[redacted]"),
      value,
    );
  process.stdout.write(scrub((run.stdout || "") + (run.stderr || "")));
  code = run.status ?? 1;
  // Reporter output must not retain either the viewer link or cookie.
  const filename = "test-results/results.json";
  const report = await readFile(filename, "utf8");
  const clean = scrub(report);
  if (clean !== report) {
    credentialLeakDetected = true;
    await writeFile(filename, clean);
    code = 1;
  }
} catch {
  console.error(
    "Protected preview QA failed; no credential diagnostics retained.",
  );
  code = 1;
} finally {
  if (secret) {
    try {
      const result = api({ revoke: { secret, regenerate: false } });
      assert.ok(!findLinks(result).some((entry) => entry.secret === secret));
      revoked = true;
    } catch {
      code = 1;
      console.error(
        "Temporary access revocation failed; the requested 30-minute expiry remains.",
      );
    }
  }
  await writeFile(
    "../bench/results/web_preview_access_audit.json",
    JSON.stringify(
      {
        started_at: started,
        completed_at: new Date().toISOString(),
        base_url: base.href,
        deployment_id: deployment,
        access: "expiring viewer link and host-scoped in-memory cookie",
        requested_ttl_seconds: 1800,
        revoked,
        credentials_persisted: credentialLeakDetected,
        cookie_scope: base.origin,
        trace_enabled: false,
        exit_code: code,
      },
      null,
      2,
    ) + "\n",
  );
}
process.exitCode = code;
