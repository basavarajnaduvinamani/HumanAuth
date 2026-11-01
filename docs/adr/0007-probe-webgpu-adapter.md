# Probe a usable GPU adapter before backend selection

## Context
Firefox exposes navigator.gpu while reporting WebGPU disabled by its blocklist on this workstation. API presence alone does not establish that the WebGPU backend is available.

## Options
A. Attempt a WebGPU session whenever the navigator property exists.
B. Probe requestAdapter with a bounded wait, cache the capability decision per worker, and otherwise select WASM.

## Decision
Choose B. A missing, null, rejected or timed-out adapter selects WASM. A usable adapter permits the normal WebGPU session attempt, with WASM fallback on session failure. Record the backend actually used in results and benchmark files.

## Consequences
Unavailable hardware does not hold up the verification flow. The capability probe adds at most one second per new worker. This does not qualify WebGPU numerical parity on hardware where no adapter is available; reported parity remains scoped to observed backends.
