# Preregistered public evaluation, 2026-11-01

Written before inspecting any new model scores. Fixed seed 20261101. No training,
threshold fitting, checkpoint selection or confidence-driven sample selection.
Existing document order fake,real and threshold 0.5 remain fixed.

Document candidate: CACTUS Lab, Zenodo 8213348, version 1.0, DOI
10.5281/zenodo.8213348. The record API declares CC-BY-4.0. Use original.zip
as genuine and both edited archives as forged. Verify published archive MD5.
Use every decodable image, deduplicate byte-identical images, and compare hashes
with the repository training data. No region-crop result unless the dataset
provides validated manipulated-region annotations: invented boxes are prohibited.
Report accuracy, forged precision/recall, and forged-score ROC AUC. Bootstrap
2,000 replicates, 95% percentile intervals. Cluster by source document where the
archive names establish correspondence; otherwise mark intervals image-level
and state that correlated edits can make them overconfident. Synthetic Spanish
IDs represent a different source domain from the repository region dataset;
pixel disjointness alone does not prove population generalization.

Face candidate: LCC-FASD official evaluation split, scientific research use as
described by the authors. Use the full detector + expanded crop + MiniFASNet
pipeline, including no-face as rejection. Fix live threshold at 0.5. APCER is
attack acceptance; BPCER is bona-fide rejection; ACER is their mean. ROC AUC and
EER use continuous live scores; EER is descriptive and never changes the product
threshold. Require a verified licence/source and reproducible evaluation labels.
Bootstrap by identity where IDs can be established, otherwise disclose the limit.

Amendment before any LCC scores, 2026-11-01: the original archive is large;
evaluate a bounded subset of the preserved LCC_FASD_evaluation folder from the
faber24/lcc-fasd mirror (version 1). Enumerate all evaluation filenames first,
then choose up to 100 per class by SHA-256(seed + filename), independent of model
outputs. This is a balanced subset, not the full official benchmark. Label
mapping follows the original loader: real* = bona fide, spoof* = attack. The
mirror lists licence Unknown; the original authors' paper states scientific
research use. Do not redistribute images. If original terms cannot establish
evaluation use, do not score. Record the mirror and official-source limitations.

Modern comparison candidate: facenox/suriAI MiniFASNet V2 SE checkpoint, Apache
2.0 according to upstream, plus the CVPR 2025 FSFM reference. Never transplant
an unverified preprocessing or replace a model based on another author's metrics.
Switch only with separated ACER intervals and complete browser parity. If data,
licence, mapping or checkpoint provenance is unresolved, publish skipped status
with exact reason, no accuracy number. Voice anti-spoofing is optional and stays
disabled unless a separately evaluated checkpoint passes all requested gates.
