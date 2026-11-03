# Document v2 protocol — declared before candidate scoring

Declared locally 2026-11-03; not publicly preregistered. Seed 20261103.

## Reproduction
Run the unchanged fixed ResNet18 inference and old CACTUS protocol on all 300 decodable unique images, retaining original archive hashes and source-group bootstrap. Write a new result basename; compare sample ID/content/model hashes and point metrics to the original. No threshold fitting. Preserve both results.

CACTUS has no verified manipulated-region annotations. Do not invent region boxes or label every subregion forged because its whole image was edited. Oracle-region diagnostics on the old Roboflow source have training overlap and cannot establish held-out transfer. A region improvement on another dataset does not prove the cause of CACTUS failure.

### Amendment before any CACTUS field scores

Source inspection found all 100 CACTUS originals byte-identical to `templates/Images/reals/esp_id_<filename>` in SIDTD. This supports transferring the original MIDV VIA field rectangles by exact filename/hash, with image-dimension and coordinate-bounds assertions for all variants. It does not supply manipulation masks. Run an exploratory paired input diagnostic on the same 300 documents: score every original annotated rectangular field using the fixed shipped model and mean the forged probabilities for one document-level score. Use all valid named rectangles (including portrait/signature when annotated), equal weights; no field/model/aggregation/threshold selection from scores. Keep document-level genuine/forged labels; do not claim every field in an edited document is forged. Retain 0.5 and the original source-cluster bootstrap seed 20261101/2000 replicates for comparison. Record paired AUC differences. Original rectangles may miss text that expands beyond the field after editing, and mean aggregation changes the decision procedure. Therefore this is a field-window diagnostic, not validation of exact forgery localisation or proof that cropping alone caused the earlier negative transfer result. It uses previously seen CACTUS cases and cannot serve as a new held-out model-selection benchmark.

## New source
Inspect the SIDTD templates archive, authors' loader, JSON generation metadata, archive licence and source/template IDs before extracting a scored sample. No real personal IDs. Keep all source images and per-image scores ignored locally; commit aggregate metrics, hashes and source counts only. Reject missing/ambiguous source or label metadata rather than infer a split from augmented filenames. Inspect MIDV-2020 as the underlying mock-document source and keep the licensing discrepancy between SIDTD repository CC BY 4.0 and TC11 CC BY-SA 3.0 visible.

## Split and selection
Group every original document and all its derivatives together. Hold out document templates/country types where reliable metadata exists: order template IDs by SHA256(seed + template ID), assign about 60% train, 20% dev, 20% test, at least one template in each. Report template and original-document group counts. Assert zero source-group and byte overlap across partitions and against the original checkpoint's repository training set. Any inability to prove disjointness is a blocking condition for that benchmark, not an excuse to use random page splitting.

Before scores, bound each class to at most 500 train, 150 dev, 150 test images by SHA256(seed + image ID), retaining all variants of selected source groups. If a split lacks both classes, do not calculate its AUC. Record sample IDs SHA256, data version/licence, archive SHA256 and rejected counts. The bounded evaluation is not the complete SIDTD benchmark. The test labels remain sealed during training and operating-point selection.

## Models and comparisons
Compare the frozen shipped ResNet18 to MobileNetV3-small and frozen DINOv2-small features plus a linear head. Only train on train sources, select epoch/regularisation on dev, report test once. Compare whole image, card crop and genuinely annotated field regions separately. Keep current ResNet18 preprocessing (RGB, bilinear 224, /255, no normalisation) fixed. Candidate pretrained preprocessing must follow its source and be explicit. Record weight hashes, package versions, seed, training budget and exact commands. No checkpoint selection from test.

## Metrics and uncertainty
Forged is positive. Report ROC AUC, forged precision and recall at both historical 0.5 and a dev-selected threshold (maximise dev balanced accuracy, tie toward a higher forged threshold). Bootstrap 2000 replicates with fixed seed, resampling original-document source clusters within held-out templates. Report percentile 95% CIs and paired candidate-minus-baseline intervals on identical test sources. Template count limits generalisation; no population-KYC claim. Report localisation quadrilateral IoU and failure rate against annotated card polygons on a separately named bounded subset. No usable polygon means no localisation metric.

## Release
Evaluate before export. A candidate can remain gateway-only. Browser shipping requires P10 licence permission, >=11 Python/TS parity cases, identical decisions, maximum absolute score difference <=0.02, total model/synthesis bytes <60,000,000 and a supported held-out comparison. A null/negative result is retained. Card localisation and field forgery labels are distinct; never turn a localisation success into an authenticity claim.
