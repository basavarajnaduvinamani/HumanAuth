# 0021 — Reduced recruiter-demo release

## Context
On 2026-11-03 the owner replaced the earlier product/research expansion with a reduced recruiter-demo scope and an approximately two-active-hour cap. Existing credit, synthetic fixture cleanup and primary-source use cases are already implemented. Existing model experiments are retained as historical research, with no new models or experiments authorised in this run.

## Options
1. Continue the earlier registration, quick-verification and model-upgrade programme.
2. Release the current bundled-sample browser prototype, clearly labelled, using the existing design and existing test suites.

For deployment, either promote a preview that Vercel rebuilds or test a production-environment staged deployment without assigning public domains, then promote the exact artifact.

## Decision
Choose option 2 and the staged promotion path already authorised by the owner. Add the exact demo label, use humanauth-id.vercel.app for metadata and discovery, and retain the existing iota alias with a host-specific permanent redirect. Run the current test suites once on the final staged candidate, plus the requested root Lighthouse audit. Promote only after passing; do not merge draft PR #2. No registration, new models, new experiments or physical-device study is added.

## Consequences
The deployed result is a recruiter demo with bundled synthetic samples and explicit negative evidence. Existing visual tokens/components and original signed/provenance documents remain unchanged. The public aliases are assigned to the same gated artifact. Earlier research remains in the repository but is not newly shipped or represented as validated product capability. GitHub Support retained-reference cleanup remains a separate owner action.
