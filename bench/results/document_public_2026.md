# Public document transfer evaluation

Whole-image cross-domain transfer to synthetic Spanish IDs, not a population KYC or fraud benchmark. No fitting on this source. Byte disjointness checked; same source filename groups cluster edits. Region-crop evaluation unavailable: archive supplies no validated forgery-region boxes.

Dataset: Dataset of fake identity documents for research purposes, v1.0, CC-BY-4.0, DOI 10.5281/zenodo.8213348.
Samples: 300; source groups: 100; IDs SHA-256: c2a543c841675f323d423137496e70ea693a0cf178891cdd64257a839e8e277f

| Metric | Value | Bootstrap 95% CI |
| --- | ---: | --- |
| accuracy | 0.6633333333333333 | [0.6566666666666666, 0.6666666666666666] |
| forged_precision | 0.6666666666666666 | [0.6666666666666666, 0.6666666666666666] |
| forged_recall | 0.99 | [0.97, 1.0] |
| roc_auc | 0.4861 | [0.4767, 0.48810000000000003] |

Model: modules/document_forgery_detection/forgery_classifier.pth
Command: python scripts/evaluate_public_documents.py
Protocol: bench/protocol_2026.md. Seed 20261101; 2000 cluster bootstrap replicates.
No region-crop result: validated manipulated-region annotations are absent.
