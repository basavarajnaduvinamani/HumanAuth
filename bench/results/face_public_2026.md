# Public face transfer evaluation

Cross-domain transfer: upstream shipped model describes CelebA-Spoof training. Fixed balanced subset, not full LCC evaluation. Repeated images/identities can make image bootstrap intervals too narrow; no subject-disjoint or population claim. Detector failures remain rejection.

Samples: 200; balanced 100 bona fide / 100 attacks. IDs SHA-256: a472aa057aca8c97b5da0d7e1bcc8fcc681c1f96df719e036311dc6e86d8a675

| Model | Metric | Value | Bootstrap 95% CI |
| --- | --- | ---: | --- |
| shipped | APCER | 0.27 | [0.18975000000000003, 0.36] |
| shipped | BPCER | 0.21 | [0.13, 0.29] |
| shipped | ACER | 0.24 | [0.18, 0.29500000000000004] |
| shipped | AUC | 0.7922999999999999 | [0.7250962500000001, 0.8592049999999999] |
| shipped | EER | 0.22999999999999998 | [0.17000000000000004, 0.29000000000000004] |
| modern_comparator | APCER | 0.3 | [0.21, 0.39] |
| modern_comparator | BPCER | 0.19 | [0.11, 0.27] |
| modern_comparator | ACER | 0.245 | [0.185, 0.305] |
| modern_comparator | AUC | 0.8362999999999998 | [0.7739975, 0.89340625] |
| modern_comparator | EER | 0.21499999999999997 | [0.15000000000000002, 0.28] |

Intervals: stratified image bootstrap, 2000 replicates, seed 20261101. Identity dependence is not accounted for.
APCER = attack acceptance; BPCER = bona fide rejection; ACER = their mean. EER uses closest ROC crossing, descriptive only.
Full detector, face-count rejection and expanded crops are included. Same detector controls the model comparison.
No model replacement without browser parity. Source and terms are in the JSON.
