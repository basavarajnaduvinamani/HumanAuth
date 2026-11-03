# 0020 — Source-specific identity workflows

## Context
Banking and governance are HumanAuth's original direction. Regulated video KYC, issuer-signed documents and a local biometric match solve different parts of identity verification. Requiring all three modalities in every setting would misstate the evidence and create accessibility barriers.

## Options
1. Describe face, voice and document matching as one universal workflow.
2. Present source-specific modalities and proposed local studies, including modern issuer-signed credentials and encrypted tickets as alternatives.

## Decision
Choose option 2. Put Indian banking and governance first. Use an assisted pension/welfare service desk as the lead repeat-verification research scenario. Keep benefit eligibility, regulated CDD, issuer validation, payments and physical access outside the prototype. Show a manual/assisted alternative rather than treating a failed match as an entitlement decision.

## Consequences
The use-case page has a modality matrix, primary citations, dated source scope and explicit hypotheses. Audio in a video call is not labelled speaker biometrics. NIST's exclusion of voice comparison is reported in its conformance context. No adoption, compliance or speed-up claim follows from these examples. Any real pilot needs trustworthy enrollment, legal and security review, accessible alternatives and institution-specific approval. Existing design tokens and components are reused without new styling.
