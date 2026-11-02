# SIDTD document comparison

Bounded SIDTD source/template-disjoint paired field study. Whole-image scores repeat per annotated field for paired comparison; unique-image counts are explicit. Not a full benchmark or real-ID result.

Protocol: bench/protocol_v2_document.md. Data, splits, hashes and uncertainty in document_v2_2026.json.

| Model / view | Dev threshold | Test AUC (95% CI) | Forged precision | Forged recall |
|---|---:|---|---:|---:|
| shipped/whole | 0.6458638906478882 | 0.5227956989247312 [0.508477933694959, 0.5450820309859973] | 0.5066666666666667 | 0.9806451612903225 |
| shipped/annotated-field | 0.9709593057632446 | 0.46464516129032263 [0.42244520468285834, 0.504674586527935] | 0.9 | 0.05806451612903226 |
| mobilenet/whole | 0.64620441198349 | 0.5364731182795699 [0.5246939545961286, 0.5575482836094091] | 0.5210526315789473 | 0.6387096774193548 |
| mobilenet/annotated-field | 0.9579454064369202 | 0.9683870967741935 [0.9448397827186537, 0.9860392529378379] | 0.9266666666666666 | 0.896774193548387 |
| dinov2/whole | 0.9170476198196411 | 0.5501935483870968 [0.5264794559141174, 0.585768860397611] | 0.0 | 0.0 |
| dinov2/annotated-field | 0.36818772554397583 | 0.9492903225806452 [0.9233197738269915, 0.9713398705921503] | 0.9295774647887324 | 0.8516129032258064 |

No result here establishes public-demo licence permission, browser parity, total download size or a population KYC operating point. No automatic model release.
