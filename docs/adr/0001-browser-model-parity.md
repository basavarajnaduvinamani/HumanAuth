# Browser model parity before live input

## Context
The gateway performs real inference. A browser product must preserve preprocessing, class order, thresholds and failure behavior. Existing local-only research weights are excluded. The existing gateway class map is fake,real; the context paragraph's real/fake order is contradicted by bench/results/doc_class_map.json.

## Options
A. Ship original fp32 models without checking another runtime.
B. Export int8/fp16 candidates, measure complete TypeScript pipelines against Python, and enable live input only for passing modalities.
C. Replace the models with newer checkpoints before establishing a baseline.

## Decision
Choose B. GO requires every decision match and maximum absolute score difference <= 0.02. A failed or incomplete gate is REPLAY with an explicit explanation. No held-out accuracy follows from a parity result. Keep the Flask API unchanged. Start the requested branch at origin/main, preserving the previous pushed upgrade branch.

## Consequences
Model assets are reproducible from tracked source checkpoints and excluded as duplicate binaries from Git. Candidates remain local until selection. Upstream face weight rights must be distinguished from the repository MIT licence. Vercel limits are checked at https://vercel.com/docs/limits#static-file-uploads on 2026-11-01; assess the entire CLI source payload before deployment.
