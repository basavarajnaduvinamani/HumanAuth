# Changelog

## 2026-11-02 — Public Vercel launch

- Publish the qualified browser product at https://humanauth-iota.vercel.app.
- Recover once from interrupted model transfer, discarding partial bytes while
  retaining manifest size/SHA verification; add two regression tests.
- Verify temporary preview access before hosted QA and revoke it afterward.
- Qualify the protected preview and public production with all 18 browser tests,
  model integrity, security/cache headers and synthetic camera lifecycle checks.
- Correct Open Graph, robots and sitemap links to Vercel's assigned public host.
- Record fresh preview/public Lighthouse reports and a real Chrome sample flow.
  Preserve the earlier scientific measurements and their limitations.

## 2026-11-02 — Preview qualification and cutoff handoff

- Prevent cold SSR controls from accepting input before hydration; add a
  regression across Chromium, Firefox and WebKit.
- Add expiring, revocable preview access for cross-browser QA, with credentials
  held in memory and credential-bearing traces disabled.
- Disable the hosting feedback toolbar to preserve same-origin-only requests.
- Version the three qualified ONNX release assets and check their manifest
  hashes before builds, so Git builds do not depend on local generated files.
- Leave public production launch pending the corrected hosted preview gate.

## 2026-11-01 — Browser product and transfer evidence

- Add the Next.js browser product with face liveness, a document demo signal and
  closed-set voice matching in a worker; retain the Flask local/API mode.
- Export a parity-qualified int8 document model and existing face/voice models,
  with size/hash manifests, upstream attribution and reproducible scripts.
- Add local capture/upload, sample flow, byte progress, verified model cache,
  explained results, media-free receipts, reset and designed error states.
- Publish public-data transfer diagnostics and confidence intervals, including
  the negative document AUC and unsuccessful newer-liveness comparison.
- Add browser timing, privacy, accessibility and Lighthouse evidence, and a web
  CI job alongside the unchanged Python full/lite jobs.
- Add responsive light/dark pages, project provenance and model limitations.
- Prepare the Vercel Hobby deployment; live status is recorded in deployment
  evidence and README after the required launch gates, not assumed here.
