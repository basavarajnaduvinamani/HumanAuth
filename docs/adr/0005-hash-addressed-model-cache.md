# Hash-addressed model caching and slow connections

## Context
Model downloads dominate cold startup on a slow connection. Scores require exactly the checkpoint bytes described by the manifest. Mutable bare URLs with immutable headers can become stale after a deployment.

## Options
A. Short timeout and revalidated bare model URLs.
B. SHA-256 query-addressed URLs, immutable HTTP caching, model-only Cache Storage and a longer loading window.

## Decision
Choose B. Fetch model URLs with the manifest hash in the query, verify byte count and SHA-256 before creating sessions, and allow up to ten minutes for a worker request. Progress reports actual bytes. Keep user media in memory only. Cold stage timings include loading; warm timings retain sessions. The current onnxruntime-web/webgpu entry requires only Asyncify runtime assets, as established from the pinned package source and browser requests.

## Consequences
A model change produces a new URL/cache key. Cache integrity failures remove the cached copy and show a retry error. The loader can continue when Cache Storage writes fail. Fast 3G can take longer than the normal sample interaction; measure it explicitly. Old hash-keyed model entries may persist until browser storage eviction. Runtime and deployment sizes are measured separately from model size.
