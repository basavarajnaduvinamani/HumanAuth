# Prefer portable single-thread WASM inside the inference worker

## Context
CI 41496806958 passed Chromium/WebKit and the privacy scan but Linux Firefox
stalled after downloading the detector, Asyncify runtime module and WASM. Its
trace remained in session startup; no result/error reached the page before the
unchanged 180-second assertion. Windows and protected-preview Firefox passed.
Thread-pool startup is an inference from the trace, not a proven upstream bug.

## Options
A. Retain up to four threads whenever cross-origin isolation is present.
B. Use one WASM thread in the already dedicated inference worker.
C. Special-case Firefox by user-agent, retaining thread pools elsewhere.

## Decision
Test and qualify B. ONNX Runtime documents numThreads=1 as disabling WASM
multithreading. Keep SIMD, the existing worker, WebGPU capability selection,
SHA checks, isolation headers, test assertions and timeouts unchanged.
https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html

## Consequences
This removes nested WASM thread startup without browser detection. Warm latency
may increase; earlier multi-thread timing results are historical, not measurements
of this configuration. Re-run full browser gates and parity, and require fresh
Linux CI. Revisit threading only with an explicit startup/latency experiment.
