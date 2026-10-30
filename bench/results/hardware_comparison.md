# Gateway CPU hardware comparison

| Hardware | Warm requests | p50 ms | p95 ms | Source |
| --- | ---: | ---: | ---: | --- |
| Intel(R) Xeon(R) Processor @ 2.80GHz | 50 | 524.62 | 1506.02 | `bench/results/latency_cpu.json` |
| 12th Gen Intel(R) Core(TM) i5-12450H | 50 | 1052.28 | 1215.62 | `bench/results/latency_cpu_12th_gen_intel_r_core_tm_i5_12450h_20261030T161355969061Z.json` |

The earlier hardware row is preserved from its existing result file. The local row
is the final run, executed without a concurrent benchmark or inference job. Both
rows use the core gateway; the optional recovered voice detector is disabled.
The boundary is in-process multipart handling through the JSON response, excluding
camera/microphone capture, network transfer and browser rendering.
