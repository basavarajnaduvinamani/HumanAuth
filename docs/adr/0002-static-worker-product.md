# Static product with browser workers

## Context
The owner requests Next.js on Vercel with no input uploads or hosted inference. Node parity passed all three baseline modalities. Browser execution still needs independent qualification, particularly quantized operators and image decoding.

## Options
A. Fetch inference results from the existing Flask gateway.
B. Serve a Next.js App Router site with same-origin assets and a dedicated inference worker; use WebGPU when supported and WASM fallback.
C. Replay all checks without live processing.

## Decision
Choose B. The worker owns inference sessions, image decoding/preprocessing and voice features. Main-thread code handles consent and capture only. Verify model hashes before session creation. Cache only model bytes keyed by SHA-256, never media or receipts. Use a typed React flow with no database, analytics or identity provider. The existing gateway stays available as local API mode. A failing browser parity check falls back explicitly to replay for that modality and disables visitor input.

## Consequences
COOP/COEP enable WASM threading, requiring same-origin runtime and font assets. A CSP limits connection destinations. Mutable model filenames revalidate at the HTTP layer; Cache Storage keys include hashes to prevent stale model reuse. Runtime assets are generated from pinned dependencies. No production deploy until the requested browser, accessibility and screenshot gates pass. The synthetic SPECIMEN is allowed to be rejected; the UI must never change evidence to manufacture an approval.
