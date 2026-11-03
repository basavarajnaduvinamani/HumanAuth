# HumanAuth browser architecture

The Next.js application in `web/` serves pages, model assets and a worker. The
worker decodes media, preprocesses it, runs YOLOv5-face plus MiniFASNet, an int8
export of the team's ResNet18, and a JavaScript port of the existing MFCC/GMM
speaker matcher. There is no remote inference endpoint, account, database or
analytics. The Flask gateway remains a separate local/API mode.

## Execution and privacy

React owns the consent and capture flow. Typed messages transfer input buffers
to a worker. Image decoding uses portable PNG/JPEG/WebP libraries because
OffscreenCanvas is not available in every supported worker. The image ports
mirror OpenCV and PIL interpolation; the voice port preserves the original
stereo framing behavior rather than silently changing its feature distribution.

The worker probes for a WebGPU adapter before attempting sessions, then falls
back to WASM. Only the observed WASM and JavaScript paths have measured parity
on this workstation. WebGPU support is attempted, not certified across devices.
COOP/COEP enables isolated WASM threads where supported. Session initialization,
decode and inference stay outside the main thread.

Before use, every model is checked against its manifest byte size and SHA-256.
Cache Storage keys include that digest. Inputs and results stay in memory;
only model responses are put in Cache Storage. Reset stops capture, terminates
the worker and clears React state. This is session cleanup, not a secure-memory
erasure guarantee. Receipts allowlist decision fields and model identifiers;
they exclude image and audio buffers. Hosting still receives ordinary static
page/asset requests and network metadata such as the visitor's IP address.

## Reproduce models and fixture parity

Use Python 3.11 and Node 24. Install the CPU gateway dependencies as in CI, plus
`scripts/requirements-web-export.txt`, then run from the repository root:

```powershell
python scripts/export_web_models.py
python scripts/parity/prepare.py
python scripts/parity/encode_browser.py
cd web
npm ci
npm run parity
```

The three qualified ONNX release assets are versioned (ADR 0013); runtime binaries remain generated build products. Voice JSON and
the model manifest are versioned. No optional local Deep4SNet or FaceNet weights
enter the browser. Read manifest attribution separately from the repository MIT
licence; upstream weight rights are not established merely by that licence.

`bench/results/web_parity.json` records Node CPU agreement. The gate requires
all decisions to match Python and maximum absolute score difference ≤ 0.02.
`bench/results/web_browser_parity.json` separately qualifies the actual browser
worker on lossless encodings of the same fixtures. Eleven cases per modality
test implementation agreement, not held-out detection accuracy. No replay
fallback is active: all three current model ports passed. Future model changes
must repeat both gates before enabling live inputs.

## Rerun checks and benchmarks

```powershell
python -m pytest -q -rs
cd web
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium firefox webkit
npm start
```

In another terminal, keep the server alive and set its URL:

```powershell
cd web
$env:BASE_URL='http://127.0.0.1:3000'
npm run e2e
node bench/browser.mjs
node bench/slow-network.mjs
node bench/deployment.mjs
node_modules/node/bin/node.exe bench/lighthouse.mjs
node bench/screenshots.mjs
node node_modules/tsx/dist/cli.mjs bench/approved-fixture.tsx
node bench/approved-screenshot.mjs
node bench/contact-sheets.mjs
```

On Linux/macOS use the platform's Node 24 executable instead of `node.exe`.
Run performance benchmarks sequentially, with other browser jobs stopped. The
latency harness measures 30 warm and 3 cold runs; total is the sum of worker
stages, excluding capture and page rendering. The slow-network harness measures
navigation to result on two visits in one context, with an explicit CDP network
profile. It is a different timing boundary and must not be compared directly.

Lighthouse records three routes in mobile and desktop presets, and fails the
gate below 90 accessibility or best practices. axe checks serious/critical
violations in the flow and at phone width. Screenshot review includes all pages
in both widths/themes. The separately labelled Verified illustration is rendered
from fusion unit-test inputs; it is never a product inference or approval claim.

Public transfer experiments are reproduced with
`scripts/evaluate_public_faces.py` and `scripts/evaluate_public_documents.py`;
read `bench/protocol_2026.md` and each result's exact command, data/version,
checksums and licence notes first. Raw evaluation media stays ignored locally.
The protocol was locally predeclared and committed after scoring. The public
document run uses Python fp32; fixture parity does not establish int8 held-out
accuracy. No newer liveness model was adopted because its ACER interval did not
meet the adoption criterion. Optional voice anti-spoofing was not added.

After a benchmark, run `python scripts/sync_web_evidence.py` from the root,
rebuild and restart the server before testing the static evidence page. Never
rebuild underneath an old running Next server: cached chunk names can go stale.

## Deployment

The owner authorizes CLI deployments to the linked `humanauth` Hobby project.
`web/vercel.json` selects the package build command, including runtime copying.
Verify `vercel project inspect --non-interactive`, deploy a preview, test the
served models/headers and browser flow, then deploy production only after the
recorded QA gate passes. Do not add secrets, paid resources or custom domains.
Keep the pull request draft and leave `main` for the owner to merge.

For protected previews, use `vercel curl` for HTTP checks or short-lived
development OIDC via `vercel env run` for browser automation, scoped to the exact
deployment origin. Do not persist tokens, browser traces containing credentials,
or environment files. Do not disable Deployment Protection to make tests pass.

The installed CLI requires a new project's first deployment to be production.
An explicit preview attempt returned `first_deployment_production`. The unexpected
initial production target was caught while Building and removed. A staged
`vercel deploy --prod --skip-domain` bootstrap requires the owner's explicit
exception to the original preview-first condition; after it is approved, create
and test an explicit `--environment preview` deployment before the public launch.
Do not treat the bootstrap question's elapsed time as approval.
The owner subsequently approved this staged exception after the panel review.

`bench/deployment.mjs` checks served manifest/model hashes, long cache headers,
COOP/COEP, browser isolation and the native camera API with a synthetic device.
It records no camera frames and does not claim physical-device validation. Set
`AUDIT_LABEL` to `local`, `preview` or `production` and `BASE_URL` to the exact
target. It never saves authentication headers and fails rather than following
an HTTP redirect with an origin-scoped credential.

For the full protected-preview suite on this Windows setup, use:

```powershell
$env:BASE_URL='https://<verified-preview-host>.vercel.app'
$env:VERCEL_QA_DEPLOYMENT_ID='dpl_<verified-preview-id>'
node bench/protected-e2e.mjs
```

The helper uses the installed authenticated Vercel CLI, checks that the selected
deployment belongs to the linked project and is a Ready preview, then creates a
30-minute viewer session and revokes it in `finally`. It keeps the link/cookie in
memory and turns traces off. This was necessary because Firefox nested workers
did not complete with the OIDC header wrapper; native cookie transport preserves
the real browser path. Public production and local/CI runs need no such session.

The suite includes a delayed-JavaScript hydration regression: server-rendered
controls remain disabled until React handlers are ready, then consent proceeds.
It adds one scenario per engine to the original five scenarios. No model,
threshold or existing assertion was weakened.

For hosted Lighthouse, set `VERCEL_QA_SUITE=lighthouse` before running the same
protected-preview helper. It audits `/`, `/verify` and `/evidence` in mobile and
desktop modes, checks final URLs, redacts credentials before writing reports,
and revokes access afterward. The helper first verifies that its cookie reaches
the actual application. Protected audits retain that cookie by disabling the
initial storage reset; each audit still uses a new browser with no app cache.

Model transport retries once after a fetch or response-stream interruption,
discarding partial bytes and fetching afresh. HTTP errors remain actionable;
size and SHA-256 checks still precede caching and inference. This does not alter
the models, preprocessing, thresholds or the original measurement scopes.
