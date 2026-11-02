# Model audit — v2 work in progress

Reviewed 2026-11-03. This records the starting point and experiment order, not completed upgrades. No candidate is qualified for browser release yet. Existing measurements remain in their original files; new runs must use separate result files. Source paths below are repository relative.

## Current pipeline

| Check | Model and training source | Preprocessing / decision | Held-out evidence | Known failure |
|---|---|---|---|---|
| Face detection + passive PAD | YOLOv5s-face plus upstream binary MiniFASNet, `AntiSpoofing_bin_1.5_128.onnx`; upstream describes CelebA-Spoof training | RGB 640 letterbox detector; expanded square face crop, RGB 128 CHW /255; live class 0, threshold 0.5; reject missing/multiple faces | LCC fixed balanced subset n=200: ACER 0.24, image-bootstrap CI [0.18, 0.295]; source `bench/results/face_public_2026.json` | Identity mapping unavailable in that evaluation: no identity-disjoint claim. Still fictional sample portrait receives live score 1. Passive PAD is insufficient. Weight-specific rights not separately established. |
| Document | Team ResNet18 checkpoint; annotated Roboflow region dataset, class order fake/real established by diagnostic | PIL bilinear resize 224, RGB CHW /255, no ImageNet normalisation; genuine class 1 threshold 0.5; current browser int8 export | CACTUS/Zenodo 8213348 v1.0, n=300: forged AUC 0.4861, source-cluster CI [0.4767, 0.4881]; `bench/results/document_public_2026.json` | Whole-image domain transfer differs from region training. Every original validation/test page overlaps a training source page; oracle-crop agreement is not held-out accuracy. No region boxes supplied in CACTUS. |
| Voice fixture compatibility | Two GMMs fitted only to local Flite synthesis; personal models removed, not renamed | 16 kHz PCM, pre-emphasis, MFCC/deltas; highest fixture likelihood, not unknown-speaker rejection | Native/browser arithmetic parity only, 11 fixtures; `bench/results/web_parity.json` and browser parity files. No public verification EER or CI | Closed-set fixture matching cannot enroll arbitrary visitors and has no validated spoof signal. |
| Fusion | Explicit rules in `gateway/fusion.py` and `web/src/lib/fusion.ts` | Liveness veto; failed document/voice reject; unavailable evidence review; equal weights and historical 0.66 mean threshold | Cross-language unit cases; no joint held-out multimodal accuracy result | Thresholds were inherited, not calibrated. No joint multimodal dataset supports a learned-fusion accuracy claim. |

Implementation sources: `gateway/checks/face.py`, `gateway/checks/document.py`, `gateway/checks/voice.py`, `web/src/workers/inference.worker.ts`, manifest and upstream module READMEs. Exact model SHA-256 and sizes remain in `web/public/models/manifest.json`.

## Ranked upgrades and panel decisions

### Document — first

PANEL — document evaluation
Options: A) keep whole-image transfer as the only test; B) reproduce it, then test annotated crops and a source-disjoint SIDTD split, comparing ResNet18 with MobileNetV3 and a frozen DINOv2 baseline.
VP Product: B tests whether cropping helps. Research: separates input mismatch from transfer. ML Eng: includes smaller models. Data Sci: group sources and separate dev/test. Platform: downloads stay local. Design/Privacy: mock documents.
Disagreement: crop improvements alone do not establish causality or real-ID performance.
Call: B; inspect licence and metadata before scores. Reversible? yes.
Resume impact: PRE-DOC—controlled comparison; SDE—localisation; APM—recapture decisions.

Rank: (1) reproduce fixed CACTUS whole-image score; (2) test the same checkpoint on trustworthy annotated regions, without inventing CACTUS forgery boxes; (3) classical card quadrilateral and perspective correction, localisation IoU on public annotation; (4) source/template-disjoint SIDTD train/dev/test, ResNet18 versus MobileNetV3-small and frozen DINOv2-small linear head. Preserve an inconclusive or negative result. An image-level forged label cannot be assigned to every region without annotation; a card crop is distinct from an annotated manipulation crop.

The [SIDTD repository](https://github.com/Oriolrt/SIDTD_Dataset) and its [licence](https://github.com/Oriolrt/SIDTD_Dataset/blob/main/LICENSE) state CC BY 4.0. Its [TC11 landing page](https://tc11.cvc.uab.es/datasets/SIDTD_1) search extract lists CC BY-SA 3.0; preserve this discrepancy, inspect archive notices, use only internally for research and redistribute no source data. The dataset derives from [MIDV-2020](https://arxiv.org/abs/2107.00396), which uses mock identity documents with generated faces. Archive URL is in the authors' loader: `https://datasets.cvc.uab.es/SIDTD/templates.zip`; HTTP header reports 1,273,966,468 bytes. Actual hash and metadata must be recorded after download. Do not treat the authors' random 80/10/10 default as source-disjoint.

### Face — second

PANEL — face evaluation
Options: A) tune on old LCC test results; B) identity-disjoint dev/test, keep LCC as labelled transfer and test active liveness independently.
VP Product: B gives clear rejection reasons. Research: no test tuning. ML Eng: current PAD/embedding candidates. Data Sci: dev calibration and clustered CIs. Platform: download cap. Design/Privacy: assisted alternatives.
Disagreement: blink/head-turn functionality is not proof of attack resistance.
Call: B; inspect licences and identity mappings first. Reversible? yes.
Resume impact: PRE-DOC—calibration discipline; SDE—capture handling; APM—accessible failure paths.

Rank: (1) verify CelebA-Spoof identity/split provenance and calibrate only on dev; (2) compare shipped and facenox MiniFASNet/CDCN-family candidates and frozen DINOv2-small features, retaining a cross-dataset evaluation; (3) evaluate a face embedding at TAR/FAR operating points with CIs; (4) random active challenge as a separately tested feature. The [official CelebA-Spoof terms](https://mmlab.ie.cuhk.edu.hk/projects/CelebA/CelebA_Spoof.html) allow non-commercial research, prohibit redistribution and commercial exploitation of images/derived data. Images remain ignored. Whether derived weights may be redistributed must not be assumed from a code licence.

[OpenCV SFace](https://github.com/opencv/opencv_zoo/tree/main/models/face_recognition_sface) is a candidate because the model directory explicitly licenses all files under Apache 2.0; inspect the pinned artifact and preprocessing. Quantisation may help size but needs parity and fresh held-out scores. [InsightFace](https://github.com/deepinsight/insightface) code rights do not establish permissive pretrained-weight rights; do not bundle non-commercial weights merely because code is MIT. [DINOv2](https://github.com/facebookresearch/dinov2) is a modern frozen-feature baseline to evaluate, not automatically a compact browser choice. MediaPipe landmarks can support an active prompt; they do not identify a person or themselves prove liveness.

### Voice — third

PANEL — visitor voice verification
Options: A) two synthetic closed-set GMMs; B) compact speaker embeddings with local enrollment and impostor rejection.
VP Product: B supports visitors. Research: held-out pairs. ML Eng: compare WeSpeaker/ECAPA. Data Sci: EER/minDCF/FAR with CIs. Platform: total byte limit. Design/Privacy: local deletable templates.
Disagreement: a voice match does not establish replay/generated-speech resistance.
Call: B, gated on evaluation/parity. Reversible? yes.
Resume impact: APM—visitor enrollment; PRE-DOC—open-set evaluation; SDE—private local matching.

Rank: (1) WeSpeaker compact model/ECAPA speaker-verification evaluation on a public pair list with separate dev calibration; (2) unknown-speaker false accepts at the shipped threshold; (3) only after these, optional AASIST spoof evaluation. The [WeSpeaker pretrained-model documentation](https://github.com/wenet-e2e/wespeaker/blob/master/docs/pretrained.md) says VoxCeleb models inherit CC BY 4.0. Confirm exact artifact identity/size, attribution and training split. Public benchmark numbers published by authors are not HumanAuth results. VoxCeleb1-O must not double as the threshold-calibration list. Flite synthetic voices remain test fixtures, not evidence of population speaker-verification performance.

### Fusion — after modality calibration

Retain transparent rules unless a properly split joint dataset is available. Fit each operating threshold on its dev list, freeze it, then score test. Report per-modality errors and CIs rather than claiming fused identity accuracy from unrelated datasets. Liveness veto precedes other rules. A local registration is a device-local enrollment, not proof of legal identity.

## Release gate

Every new/swapped browser model requires explicit public research-demo licence permission, at least 11 Python/TS parity fixtures with identical decisions and maximum absolute difference at most 0.02, and held-out comparison with CIs matching or improving the shipped model. Total visitor model/synthesis bytes must stay strictly below 60,000,000. Current total is 56,083,046; only 3,916,954 bytes remain before that strict bound. A compact candidate may require replacing a larger component; that is another model swap and needs its own comparison. A failed gate means gateway-only or rejected with measured reasons, never an unqualified silent swap.

## Experiment record status

The fixed CACTUS reproduction completed: `bench/results/document_public_v2_reproduction_2026.json` and `.md`. All point metrics, CIs, sample ID/content hashes and model hash match the original exactly; AUC remains 0.4861 [0.4767, 0.4881]. This confirms reproducibility, not a model improvement. Other old scores above retain their stated limitations. Downloading data, selecting an architecture or adding a protocol does not count as a measurement. Results and source hashes will be appended as runs complete. Physical-camera/phone tests remain pending.


## Completed document diagnostics (2026-11-03)

CACTUS same-case field-window diagnostic: `bench/results/document_cactus_field_windows_v2_2026.json` and `.md`. All 100 original images are byte-identical to the annotated MIDV sources in SIDTD. Averaging probabilities over all original annotated rectangular fields gives AUC 0.4582 [0.43834875, 0.47220375], versus whole-image 0.4861 [0.4767, 0.4881]. Paired difference -0.0279 [-0.0458025, -0.0092]. This does **not** support field cropping as a fix for CACTUS transfer. It is exploratory, uses previously seen cases, and original field windows are not manipulation masks.

Separate SIDTD source/template-disjoint comparison: `bench/results/document_v2_2026.json` and `.md`; protocol `bench/protocol_v2_document.md`. Six train templates, two dev, two test; 150 genuine and 155 forged test field records, clustered by original document. Whole scores repeat for paired field comparisons, with unique-image counts in JSON. Dev selects head regularisation and thresholds; test is not used for either.

| Model / input | Test forged AUC | 95% source-cluster CI |
|---|---:|---|
| shipped/whole | 0.5227956989247312 | [0.508477933694959, 0.5450820309859973] |
| shipped/annotated-field | 0.46464516129032263 | [0.42244520468285834, 0.504674586527935] |
| mobilenet/whole | 0.5364731182795699 | [0.5246939545961286, 0.5575482836094091] |
| mobilenet/annotated-field | 0.9683870967741935 | [0.9448397827186537, 0.9860392529378379] |
| dinov2/whole | 0.5501935483870968 | [0.5264794559141174, 0.585768860397611] |
| dinov2/annotated-field | 0.9492903225806452 | [0.9233197738269915, 0.9713398705921503] |

The paired MobileNetV3 field-minus-shipped-field AUC difference is {'difference': 0.5037419354838709, 'ci95': [0.4543738602754353, 0.5512492674313325]}. The corresponding DINOv2 comparison is {'difference': 0.48464516129032253, 'ci95': [0.43557724546443477, 0.5329375194899081]}. These intervals condition on two held-out template types; they do not establish population real-ID performance. Whole-image candidate-minus-baseline intervals include zero. No model is browser-qualified or shipped from this experiment. Original-card field localisation is separate from manipulation-region annotation; a camera card boundary alone cannot supply known edited-field windows for arbitrary IDs.

Research packages and download logs remain local. Exact timm model cards state Apache 2.0; public-demo redistribution still requires the full P10 artifact/parity/byte gates. SIDTD and underlying MIDV terms differ: original MIDV licence is CC BY-SA 2.5 (author FTP), while SIDTD repository says CC BY 4.0 and TC11 lists CC BY-SA 3.0. Images are used locally for research and never redistributed.

Localisation diagnostic completed: `bench/results/document_localization_v2_2026.json` and `.md`. Exact TypeScript candidate on 100 MIDV photos, ten templates, display-oriented JPEG decode. Coverage 0.32 [0.20,0.44], mean IoU 0.2529770019 [0.1472394095,0.3663975627], median IoU 0, fraction IoU >=0.5 0.29 [0.17,0.42]. Missing detections score zero. This is a weak result: do not silently enable this as a reliable card detector. The module remains isolated pending a better candidate or a justified recapture/manual-crop design. No parameter tuning was applied after the scores.
