# Browser copy source ledger

Reviewed 2026-11-01. Counts and percentages are formatted from the listed files;
formatting is not an additional measurement. SVG coordinates, step numbers,
section labels and schema versions are interface structure, not performance claims.

| String / value | Page | Source |
| --- | --- | --- |
| Bundled result, scores and rejection | `/` | `web/public/samples/replay.json` (saved Python gateway output, explicitly labelled) |
| B.Tech, DSU, 2024–25; funding quote | `/`, `/about` | `docs/project_provenance.json`; signed report and sanction-letter digests recorded there |
| Four team names; 48S_BE_5942; 48th Series | `/about` | `docs/project_provenance.json` |
| IJRAR Vol 12(1), February 2025, IJRAR25A1939 | `/about` | `docs/project_provenance.json`, owner-provided reference; no verified official URL |
| Model names, sizes, precisions, SHA-256 and source paths | `/verify`, `/how-it-works` | `web/public/models/manifest.json` |
| 41.6 MB model download (decimal, one place) | `/verify` | Sum of `manifest.models[].size_bytes` = 41,571,370 bytes, runtime excluded |
| 4-second recording; two enrolled identities | `/verify` | `web/src/components/verification-flow.tsx`; `web/public/models/voice-gmm.json` |
| 8 MB image / 10 MB audio upload limits | `/verify` | `gateway/validation.py`; `web/src/components/verification-flow.tsx` (binary limits, UI conventional MB) |
| 0.5 per-check thresholds; 0.66 fusion; veto/review logic | `/verify`, `/how-it-works` | `gateway/config.py`, `gateway/fusion.py`, `web/src/lib/fusion.ts` |
| RGB, 640 letterbox, 1.5 crop, 128 BGR, 224 resize, class index 1 | `/how-it-works` | `gateway/checks/face.py`, `gateway/checks/document.py`, `bench/results/doc_class_map.json`, `web/src/lib/` |
| 44.1 kHz stereo, 1103 FFT, 26 filters, 20 MFCC + 20 deltas | `/how-it-works` | `gateway/checks/voice.py`, `web/src/lib/voice/index.ts`, exported GMM parameter JSON |
| 200 images, 100/100 face subset, APCER/BPCER/ACER/AUC/EER and 95% CIs | `/evidence` | `bench/results/face_public_2026.json` |
| 300 images, 100 filename groups, document metrics and 95% CIs | `/evidence` | `bench/results/document_public_2026.json` |
| Dataset version 1.0 and CC-BY-4.0 | `/evidence` | `bench/results/document_public_2026.json` (Zenodo source record) |
| GO, 11 cases per modality, maximum differences, 0.02 gate | `/evidence` | `bench/results/web_parity.json`, `bench/results/web_browser_parity.json` |
| 50 warm gateway requests; Xeon 524.62/1506.02 ms | `/evidence` | `bench/results/latency_cpu.json` |
| i5-12450H gateway 1052.28/1215.62 ms | `/evidence` | `bench/results/latency_cpu_12th_gen_intel_r_core_tm_i5_12450h_20261030T161355969061Z.json` |
| 30 warm / 3 cold browser runs; all p50/p95 rows | `/evidence` | `bench/results/web_latency_latest.json` points to timestamped run |
| 0 input-upload bytes / 0 third-party requests; CI assertions | `/`, `/evidence` | `bench/results/web_network_audit.json`; assertions in `web/e2e/verification.spec.ts`, verified `bench/results/web_ci_2026.json` |
| Fast 3G 150 ms, 204800 B/s, 261.8 s / 49.1 s, 0 repeat model GETs | `/evidence` | `bench/results/web_slow_network.json`; emulated laptop, not physical phone |
| 96.5% integrated, 96.0% face (scope not identified), 98.5% document TRAINING | `/evidence` only in app | `bench/results/reported_results_reference.json` |
| Runtime result scores, timings and backend | `/verify` | Current worker result; receipt records them, no fixed accuracy claim |
| Upstream weights not trained by team; MIT scope | `/about`, `/how-it-works`, footer | `LICENSE`, `modules/face_anti_spoofing/README.md`, manifest licence notes |

The public protocol was locally written before scoring and committed afterward;
it is not a public preregistration. Document transfer uses the Python fp32 model;
fixture parity does not establish held-out int8 accuracy. Face confidence intervals
are image-level because identity mappings were unavailable. No claim of calibrated
fraud detection, face-to-ID matching, unknown-speaker rejection or deepfake detection.
