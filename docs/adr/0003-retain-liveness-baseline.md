# Retain the shipped liveness model after a transfer comparison

## Context
The owner requested a modern model only when it improves ACER with clearly separated intervals and passes browser parity. A fixed, preregistered LCC evaluation subset and the same shipped face detector were used for both models. No threshold fitting was performed.

## Options
A. Replace the shipped MiniFASNet with facenox MiniFASNet V2 SE (Apache-2.0 upstream).
B. Retain the shipped model and publish the comparison, including its limitations.

## Decision
Choose B. bench/results/face_public_2026.json records shipped ACER 0.240 (95% image-bootstrap CI 0.180–0.295), versus comparator 0.245 (0.185–0.305). The comparator does not meet the ACER adoption criterion. Its higher AUC is not a reason to change the fixed decision threshold. No browser migration of the comparator or gateway model swap was performed.

## Consequences
The small balanced transfer subset is useful diagnostic evidence, not a population or full-benchmark result. Evaluation filenames do not preserve subject identities, so image intervals may be too narrow. Publish the negative document transfer result in bench/results/document_public_2026.json as well. The document model is a whole-image demo signal; it must not be presented as a validated e-KYC classifier.
