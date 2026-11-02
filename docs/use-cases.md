# Where identity checks are used

Primary sources checked: **2026-11-03**. Research context, not legal advice or a claim of adoption. Source versions matter: an accessible historical guideline is not evidence that it contains every current amendment.

HumanAuth is a research demo; these are settings where face, voice and document checks are used, and what an on-device design would change.

## Modality matrix

Banking and governance come first. The three modality columns describe the cited workflow, not a universal requirement. Call audio is not evidence of biometric speaker comparison. Benefits below are hypotheses; none is a measured HumanAuth improvement.

| Setting / who verifies whom | Face | Voice | Document |
|---|---|---|---|
| [Bank account opening](#bank-onboarding) — A bank's authorised official verifies an applicant. | Live + photo match | Call audio only | Official ID + issuer checks |
| [Bank re-verification](#bank-repeat) — A bank verifies an existing customer's updated details. | Video route | Call audio only | As required by route |
| [Pension life certificates](#pension) — The pension service authenticates a pensioner for a digital life certificate. | Face-auth route | Not documented | Registered identity data |
| [Welfare and ration counters](#welfare) — An authorised service agency authenticates its beneficiary. | Additional auth mode | Not documented | Scheme identity records |
| [Citizen document checks](#documents) — A requester verifies documents supplied by an authorised issuer. | Not required by source | Not documented | Issuer-signed record |
| [Securities-account KYC](#investor) — A registered intermediary verifies an investor. | Live photo / video IPV | No biometric mandate | OVD / digital evidence |
| [Insurance video identification](#insurance) — An insurer or authorised person verifies a customer or beneficiary. | Live video + ID match | Call audio only | KYC evidence |
| [NPS subscriber onboarding](#nps) — A reporting entity verifies an NPS subscriber. | Live photo / VCIP | No biometric mandate | OVD / issuer records |
| [SIM issuance and replacement](#sim) — A telecom provider's authorised point of sale verifies a subscriber. | Live photo + match | Not documented | Identity / address proof |
| [Campus and office-style entry](#campus) — Campus security checks a member or visitor; an office is a proposed analogous setting. | Manual ID comparison | Not documented | Card / visitor pass |
| [Exam-centre candidate verification](#exam) — Exam-centre staff verify a registered candidate. | Specified in tender | Not documented | Candidate / ID record |
| [Driver and delivery onboarding](#gig) — A platform checks that its worker matches the screened account. | Live selfie + match | Not documented | Onboarding documents |
| [Telemedicine identification](#telemedicine) — A practitioner and patient establish each other's identity. | Depends on mode | Consultation audio | As appropriate |
| [Hotel check-in](#hotel) — Hotel staff compare the guest, reservation and photo ID. | Manual photo check | Not documented | Photo ID + reservation |
| [Airport journeys](#digiyatra) — An authorised travel workflow checks a passenger and journey credentials. | Voluntary face route | Not documented | ID + travel credentials |
| [Remote bank onboarding](#global-bank) — A digital bank checks a prospective customer's identity. | ID + selfie video | No matcher evidenced | Photo ID |
| [Call-centre voice authentication](#phone) — Telephone-banking staff authenticate an enrolled caller. | Not in this workflow | Voice ID | Not repeated on call |
| [European identity wallets](#eu-wallet) — An issuer provisions credentials; a relying party checks a presentation. | Proofing / activation option | Not mandated | Signed credentials |
| [Identity-proofing and authentication guidance](#nist) — A credential provider proves identity; a verifier authenticates a subscriber. | Biometric option + PAD | Excluded in 63B-4 | Validated identity evidence |

## Risks and possible local studies

<a id="bank-onboarding"></a>
### Bank account opening

Problem addressed: Impersonation and mismatched identity evidence are risks addressed by the required checks.

Possible local study: Local capture feedback could surface recapture issues before officer review. HumanAuth does not perform bank CDD, issuer verification, geolocation or regulated recording.

Sources: [RBI commercial-bank KYC directions, paragraphs 26–27](https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13141).

<a id="bank-repeat"></a>
### Bank re-verification

Problem addressed: Customers may need another branch or video interaction when records need updating.

Possible local study: Study a local repeat-match step during a consented branch visit. A local match cannot replace the bank's official Re-KYC or authorise a payment.

Sources: [HDFC Bank Re-KYC service](https://www.hdfc.bank.in/savings-account/services/re-kyc).

<a id="pension"></a>
### Pension life certificates

Problem addressed: Physical submission and worn fingerprints can create access barriers.

Possible local study: Study assisted, same-device re-identification at a service desk. This demo cannot issue a life certificate or decide pension eligibility.

Sources: [Jeevan Pramaan face-authentication application requirements](https://jeevanpramaan.gov.in/v2.0/apppackage/appdownload); [NIC: Jeevan Pramaan digital life certificates](https://informatics.nic.in/files/websites/july-2026/jeevan-pramaan.php); [UIDAI authentication FAQs](https://uidai.gov.in/hi/authentication).

<a id="welfare"></a>
### Welfare and ration counters

Problem addressed: Worn or missing fingerprints need an alternative verification route.

Possible local study: Explore a voluntary local repeat-check with an attendant fallback. The demo does not connect to Aadhaar or establish entitlement; a research failure must not deny benefits.

Sources: [UIDAI authentication FAQs](https://uidai.gov.in/hi/authentication).

<a id="documents"></a>
### Citizen document checks

Problem addressed: An uploaded scan and an issuer-signed document have different provenance.

Possible local study: Show how a visual tampering signal differs from issuer validation. A classifier score cannot establish an issuer's signature or a document's legal validity.

Sources: [DigiLocker technology and issuer-signature verification](https://www.digilocker.gov.in/web/technology); [DigiLocker: issued and uploaded document distinction](https://www.digilocker.gov.in/assets/DIGILOCKER%20ASK%20EXPERT.pdf).

<a id="investor"></a>
### Securities-account KYC

Problem addressed: Digital onboarding needs evidence and live-presence checks, not just a form.

Possible local study: Study clear recapture and review reasons before submission. The SEBI FAQ is workflow context; HumanAuth is not an intermediary or KRA integration.

Sources: [SEBI KYC FAQs, questions 26–27](https://www.sebi.gov.in/sebi_data/faqfiles/may-2024/1715694256793.pdf).

<a id="insurance"></a>
### Insurance video identification

Problem addressed: Recorded or mismatched identity material is a risk the video workflow addresses.

Possible local study: Explore local checks that explain why an image or capture needs review. The insurer retains responsibility; its VBIP retention and review workflow is not implemented here.

Sources: [IRDAI AML/CFT guidelines, Annexure II: VBIP](https://irdai.gov.in/document-detail?documentId=1345417); [HDFC Life Video KYC consent portal](https://videokyc.hdfclife.com/).

<a id="nps"></a>
### NPS subscriber onboarding

Problem addressed: Expression-based challenges can exclude subscribers with disabilities.

Possible local study: Study assisted review and an explicit alternative path. PFRDA's modes and records are distinct from this demo; no NPS registration is created.

Sources: [PFRDA KYC master circular, section 8.2.1.5](https://pfrda.org.in/documents/33652/147653/Revised%2BMaster%2BCicular%2BKYC%2Bguidelines.pdf).

<a id="sim"></a>
### SIM issuance and replacement

Problem addressed: Printed photos, mismatched portraits and manual form errors are addressed in DoT instructions.

Possible local study: Study local live-capture prompts before an authorised provider's checks. This is not a telecom KYC app and cannot activate a connection.

Sources: [DoT subscriber-verification instructions: face modality and photo matching](https://www.dot.gov.in/static/uploads/2026/02/1a22ca62a5bf5c41431e2ae47ebc3928.pdf).

<a id="campus"></a>
### Campus and office-style entry

Problem addressed: A photo of an ID on a phone may be presented where a physical card is expected.

Possible local study: Study repeat recognition on an attendant's device after authorised enrollment. An access badge or visitor pass may be simpler; no institution uses HumanAuth.

Sources: [IIT Madras Security Section: identity cards and visitor passes](https://www.iitm.ac.in/the-institute/administration/security-section).

<a id="exam"></a>
### Exam-centre candidate verification

Problem addressed: Entry verification must distinguish the candidate from an impersonator.

Possible local study: Study an assisted mismatch explanation and review queue. The NTA tender is a procurement specification; it is not proof of deployment at every centre or an endorsement.

Sources: [NTA candidate-verification procurement specification](https://www.nta.ac.in/Download/Tender/Tender_20260220132306.pdf).

<a id="gig"></a>
### Driver and delivery onboarding

Problem addressed: Account sharing and photographing a photo are explicitly listed failure cases.

Possible local study: Study a repeat local match without repeatedly retaining raw captures. Background screening and platform account control remain separate; the cited example is Uber's driver policy.

Sources: [Uber India: Real-Time ID Check and account access](https://www.uber.com/in/en/drive/driver-app/deactivation-review/); [Uber India driver-document requirements](https://www.uber.com/in/en/drive/requirements/documents/).

<a id="telemedicine"></a>
### Telemedicine identification

Problem addressed: Anonymous or mistaken identity is unsafe; one fixed modality is not prescribed for every consultation.

Possible local study: Study optional pre-consultation repeat matching with staff assistance. No diagnosis, medical identity or access-to-care decision is made by this demo.

Sources: [MoHFW Telemedicine Practice Guidelines, section 3.2](https://www.mohfw.gov.in/pdf/Telemedicine.pdf).

<a id="hotel"></a>
### Hotel check-in

Problem addressed: A booking reference alone may not meet a property's check-in identity policy.

Possible local study: Explore a consented same-stay repeat check at an attended desk. This example is one Indian hotel's policy, not a nationwide biometric requirement.

Sources: [Hotel Taj Resorts: check-in photo-ID policy](https://www.hoteltajresorts.com/refund-and-cancellation-policy.html).

<a id="digiyatra"></a>
### Airport journeys

Problem addressed: Repeated passenger and boarding-pass checks add touchpoints during a journey.

Possible local study: Study a simulated attended gate with locally enrolled synthetic participants. Digi Yatra is a design reference; HumanAuth has no airport integration or boarding authority.

Sources: [Ministry of Civil Aviation: Digi Yatra](https://www.civilaviation.gov.in/our-digital-initiatives); [Digi Yatra policy: travel credentials and face-token processing](https://www.civilaviation.gov.in/sites/default/files/2023-07/Digi%20Yatra%20Policy%20%28DIGI%20YATRA%29.pdf).

<a id="global-bank"></a>
### Remote bank onboarding

Problem addressed: A branchless bank needs to link the applicant to the submitted ID.

Possible local study: Study local capture quality and face-to-portrait consistency. Monzo's published workflow is an example; it is not a claim about HumanAuth or every bank.

Sources: [Monzo: identity checks during account opening](https://monzo.com/help/opening-an-account/how-to-open-a-Monzo-Personal-Account).

<a id="phone"></a>
### Call-centre voice authentication

Problem addressed: Repeated security questions create another verification step.

Possible local study: Use a local speaker-verification study to measure impostor acceptance and rejection. NatWest's service does not validate this prototype. NIST authentication guidance separately excludes voice comparison.

Sources: [NatWest Premier: Voice ID](https://www.natwest.com/premier-banking/contact-us.html); [NIST SP 800-63B-4, section 3.2.3](https://pages.nist.gov/800-63-4/sp800-63b.html).

<a id="eu-wallet"></a>
### European identity wallets

Problem addressed: Sharing an entire document can reveal more attributes than the transaction needs.

Possible local study: Explore data minimisation without exporting biometric templates. The EUDI framework is not a claim of universal deployment or wallet interoperability here.

Sources: [European Commission: European Digital Identity framework](https://digital-strategy.ec.europa.eu/en/policies/eudi-regulation); [European Commission: wallet selective disclosure](https://ec.europa.eu/digital-building-blocks/sites/spaces/EUDIGITALIDENTITYWALLET/pages/949256476/What%2Bis%2Bselective%2Bdisclosure%2Bof%2Battributes).

<a id="nist"></a>
### Identity-proofing and authentication guidance

Problem addressed: A biometric match alone does not bind a person to trusted identity evidence or a physical authenticator.

Possible local study: Make proofing, later local matching and the limits of each explicit. This prototype implements no NIST assurance level or conformity claim.

Sources: [NIST SP 800-63A-4: identity proofing](https://pages.nist.gov/800-63-4/sp800-63a.html); [NIST SP 800-63B-4, section 3.2.3](https://pages.nist.gov/800-63-4/sp800-63b.html).

## Entry scenarios — hypotheses

Lead scenario: an assisted pension or welfare service desk. Registration happens only in a voluntary research session after the ordinary official process. A research failure never denies a benefit. This is more defensible than claiming that a local template replaces a bank, Aadhaar or an issuer.

### Pension or welfare service desk

Who registers and where: A consenting visitor, assisted by staff, on the desk device after the normal official process.

Who verifies: An attendant re-identifies a locally enrolled visitor during the visit.

What can go wrong: Access barriers require alternatives to a failed biometric check.

Proposed Quick verify use: Demonstrate a short local repeat-check, show reasons and allow staff review. Keep eligibility decisions outside the demo.

Sources: [UIDAI authentication FAQs](https://uidai.gov.in/hi/authentication); [Jeevan Pramaan face-authentication application requirements](https://jeevanpramaan.gov.in/v2.0/apppackage/appdownload).

### Office or campus gate

Who registers and where: An authorised staff member enrolls a consenting member on the gate device.

Who verifies: The attendant compares a returning participant with this device's registrations.

What can go wrong: Institutional ID and visitor-pass checks still need a trusted enrollment process.

Proposed Quick verify use: Study same-device matching and a badge/manual fallback; no connected door lock.

Sources: [IIT Madras Security Section: identity cards and visitor passes](https://www.iitm.ac.in/the-institute/administration/security-section).

### Event entry

Who registers and where: An organiser enrolls volunteers at an attended registration desk.

Who verifies: An event attendant checks a returning participant.

What can go wrong: Copied ticket images can fail modern mobile-ticket checks.

Proposed Quick verify use: Treat this as an optional study; encrypted tickets may solve entry with less biometric data.

Sources: [Ticketmaster mobile-ticket entry FAQ](https://www.ticketmaster.com/mobile-tickets).

### Exam hall

Who registers and where: Authorised exam staff would bind a candidate to official records; this demo uses synthetic records only.

Who verifies: An attendant would review a match or exception at the hall.

What can go wrong: A false rejection can prevent a genuine candidate entering.

Proposed Quick verify use: Demonstrate exception reasons and review; do not decide exam admission.

Sources: [NTA candidate-verification procurement specification](https://www.nta.ac.in/Download/Tender/Tender_20260220132306.pdf).

### Hostel reception

Who registers and where: Hostel staff would enroll a consenting resident on reception's device.

Who verifies: The receptionist would check a returning resident or registered visitor.

What can go wrong: A local face match cannot replace the institution's visitor registration rules.

Proposed Quick verify use: Explore repeat matching with expiry, per-person deletion and a register/card fallback.

Sources: [IIT Delhi hostel rules: visitor registration](https://home.iitd.ac.in/hostel-rules.php).

### Hospital patient re-identification

Who registers and where: A staff-assisted volunteer enrolls in a separate research session.

Who verifies: An attendant reviews the research match, separately from clinical care.

What can go wrong: Patient misidentification can cause harm; guidance calls for multiple identifiers and non-verbal alternatives.

Proposed Quick verify use: Study an additional signal only. Never use the demo to deny treatment or replace clinical identification.

Sources: [WHO Patient Identification safety solution](https://cdn.who.int/media/docs/default-source/patient-safety/patient-safety-solutions/ps-solution2-patient-identification.pdf).

### Airport-style self-boarding

Who registers and where: An authorised travel process binds a passenger to travel credentials; the demo enrolls synthetic participants.

Who verifies: A simulated gate checks local registrations.

What can go wrong: Passenger identity and journey eligibility are separate checks.

Proposed Quick verify use: Use Digi Yatra as a sourced design reference, with no real boarding approval or integration.

Sources: [Ministry of Civil Aviation: Digi Yatra](https://www.civilaviation.gov.in/our-digital-initiatives); [Digi Yatra policy: travel credentials and face-token processing](https://www.civilaviation.gov.in/sites/default/files/2023-07/Digi%20Yatra%20Policy%20%28DIGI%20YATRA%29.pdf).

## Two product briefs

### Bank onboarding followed by an attended repeat check

For applicants and branch staff, the problem is collecting usable identity evidence and then recognising a returning customer without confusing the repeat check with regulated KYC. Study local capture feedback before the bank’s authorised video process, followed by a voluntary same-device repeat match during an attended visit. Measure onboarding completion, recapture rate, staff review time, repeat-match time to decision, genuine-user rejection and impostor acceptance on separate held-out and physical-device protocols. These are metric definitions, not achieved numbers or invented targets. A false acceptance risks impersonation; a false rejection delays a genuine customer and needs an assisted route. Before launch, the bank must retain issuer validation, CDD, audit/retention controls and transaction authorisation, bind enrollment to trusted records, review security and lawful processing, and validate accessibility and performance on the intended population. ATM entry or high-value payment step-up remains outside this prototype; a local match is not authority to move money.

### Pension or welfare service-desk repeat identification

For pensioners, beneficiaries and service-desk staff, the problem is completing an identification step when physical submission or worn fingerprints create barriers. Study a consented, staff-assisted repeat match on one desk device after the normal official process, with pseudonymous labels, expiry, per-person deletion and a manual alternative. Measure successful assisted completion, genuine-user rejection by relevant age/accessibility groups, impostor acceptance, escalation rate and time to decision; report uncertainty and a failure as a failure. Rejecting an elderly genuine user can interrupt essential access, while accepting an impostor can misdirect service, so neither an average score nor speed alone is a launch criterion. Launch would require a responsible institution, trustworthy enrollment, lawful processing and retention, independent review, population-specific tests and an accessible official alternative. HumanAuth neither issues a life certificate nor establishes welfare eligibility.

## Timing context

Standard Chartered India’s Video KYC FAQ estimates about six minutes for the process and under fifteen minutes including subsequent agent checks. This is one provider’s estimate for regulated onboarding, not a measured industry mean. A local repeat match performs a different task. Physical-device timing for the new HumanAuth flow is pending; no speed-up ratio or universal time promise is supported. Source: [Standard Chartered India](https://www.sc.bank.in/video-kyc/).

## Source qualifications and rejected interpretations

- Current RBI commercial-bank directions: 2025 directions updated October 1, 2026. The 2016 master direction is historical context for commercial banks, not the current primary reference. Accessibility matters: specific gestures must not exclude people unable to perform them.
- SEBI May 2024 FAQ, IRDAI 2022 guidelines and PFRDA September 2025 circular are dated workflow sources. A real deployment must check later amendments and its entity-specific obligations.
- NTA February 2026 material is a procurement specification, not evidence of deployment at every examination centre.
- HSBC Hong Kong ended phone Voice ID support on August 18, 2024; exclude it as a current example. NatWest currently describes a telephone Voice ID service. NIST SP 800-63B-4 excludes biometric voice comparison from its conformant authentication scheme; this is not a claim that every bank voice service is universally prohibited.
- The hotel example is Hotel Taj Resorts India Private Limited, not a claim about the IHCL Taj brand or a nationwide biometric mandate.
- Campus and hostel policies document ID/pass/visitor-registration rules. Local biometric entry is our proposed study, not an institutional deployment claim. Driver policy is sourced; delivery-partner use is a proposed analogy, not a universal provider policy.
- WHO’s patient-identification solution is May 2007 safety guidance, not current deployment evidence. Its multiple-identifier principle does not authorise replacing clinical identifiers with a research match.
- A spoken phrase in a selfie video is not proof of a voiceprint matcher. An uploaded scan is not an issuer-signed digital credential. Encrypted tickets or physical badges may solve an entry problem with less biometric collection.

## Primary-source ledger

| Key | Primary source | Version / scope | Accessed |
|---|---|---|---|
| rbi-current | [RBI commercial-bank KYC directions, paragraphs 26–27](https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13141) | 2025 directions; updated October 1, 2026 | 2026-11-03 |
| rbi-history | [RBI KYC Master Direction, 2016 — historical framework](https://www.rbi.org.in/scripts/BS_ViewMasDirections.aspx?id=11566) | Updated August 14, 2025; commercial-bank framework subsequently replaced | 2026-11-03 |
| bank-repeat | [HDFC Bank Re-KYC service](https://www.hdfc.bank.in/savings-account/services/re-kyc) | Live service page | 2026-11-03 |
| uidai | [UIDAI authentication FAQs](https://uidai.gov.in/hi/authentication) | Live FAQ; consent-based 1:1 face authentication | 2026-11-03 |
| pension | [Jeevan Pramaan face-authentication application requirements](https://jeevanpramaan.gov.in/v2.0/apppackage/appdownload) | Live Android/iOS application page | 2026-11-03 |
| pension-context | [NIC: Jeevan Pramaan digital life certificates](https://informatics.nic.in/files/websites/july-2026/jeevan-pramaan.php) | NIC article, July 2026 | 2026-11-03 |
| digilocker | [DigiLocker technology and issuer-signature verification](https://www.digilocker.gov.in/web/technology) | Live technology page | 2026-11-03 |
| digilocker-issued | [DigiLocker: issued and uploaded document distinction](https://www.digilocker.gov.in/assets/DIGILOCKER%20ASK%20EXPERT.pdf) | Questions 91–94 | 2026-11-03 |
| sebi | [SEBI KYC FAQs, questions 26–27](https://www.sebi.gov.in/sebi_data/faqfiles/may-2024/1715694256793.pdf) | May 2024 FAQ, retrieved on the review date; not an exhaustive legal-update ledger | 2026-11-03 |
| irdai | [IRDAI AML/CFT guidelines, Annexure II: VBIP](https://irdai.gov.in/document-detail?documentId=1345417) | 2022 guideline text; later amendments must also be checked for real deployment | 2026-11-03 |
| insurance-live | [HDFC Life Video KYC consent portal](https://videokyc.hdfclife.com/) | Live provider workflow | 2026-11-03 |
| pfrda | [PFRDA KYC master circular, section 8.2.1.5](https://pfrda.org.in/documents/33652/147653/Revised%2BMaster%2BCicular%2BKYC%2Bguidelines.pdf) | Updated September 25, 2025; assisted, unassisted and hybrid VCIP | 2026-11-03 |
| dot | [DoT subscriber-verification instructions: face modality and photo matching](https://www.dot.gov.in/static/uploads/2026/02/1a22ca62a5bf5c41431e2ae47ebc3928.pdf) | Official instruction document, sections 4–6; retrieved from DoT | 2026-11-03 |
| campus | [IIT Madras Security Section: identity cards and visitor passes](https://www.iitm.ac.in/the-institute/administration/security-section) | Live institutional policy | 2026-11-03 |
| hostel | [IIT Delhi hostel rules: visitor registration](https://home.iitd.ac.in/hostel-rules.php) | Live institutional policy | 2026-11-03 |
| exam | [NTA candidate-verification procurement specification](https://www.nta.ac.in/Download/Tender/Tender_20260220132306.pdf) | February 2026 tender; a requirement specification, not proof of universal deployment | 2026-11-03 |
| gig | [Uber India: Real-Time ID Check and account access](https://www.uber.com/in/en/drive/driver-app/deactivation-review/) | Live provider policy | 2026-11-03 |
| gig-docs | [Uber India driver-document requirements](https://www.uber.com/in/en/drive/requirements/documents/) | Live provider workflow | 2026-11-03 |
| telemedicine | [MoHFW Telemedicine Practice Guidelines, section 3.2](https://www.mohfw.gov.in/pdf/Telemedicine.pdf) | 2020 guidance; identification context, not a biometric mandate | 2026-11-03 |
| hotel | [Hotel Taj Resorts: check-in photo-ID policy](https://www.hoteltajresorts.com/refund-and-cancellation-policy.html) | One hotel's published policy; no industry-wide mandate inferred | 2026-11-03 |
| digiyatra | [Ministry of Civil Aviation: Digi Yatra](https://www.civilaviation.gov.in/our-digital-initiatives) | Live ministry description; voluntary conventional alternative | 2026-11-03 |
| digiyatra-policy | [Digi Yatra policy: travel credentials and face-token processing](https://www.civilaviation.gov.in/sites/default/files/2023-07/Digi%20Yatra%20Policy%20%28DIGI%20YATRA%29.pdf) | Published policy; airport data exchange differs from this local demo | 2026-11-03 |
| eu | [European Commission: European Digital Identity framework](https://digital-strategy.ec.europa.eu/en/policies/eudi-regulation) | eIDAS 2.0 framework; not universal wallet deployment | 2026-11-03 |
| eu-disclosure | [European Commission: wallet selective disclosure](https://ec.europa.eu/digital-building-blocks/sites/spaces/EUDIGITALIDENTITYWALLET/pages/949256476/What%2Bis%2Bselective%2Bdisclosure%2Bof%2Battributes) | Live framework guidance | 2026-11-03 |
| nist-proof | [NIST SP 800-63A-4: identity proofing](https://pages.nist.gov/800-63-4/sp800-63a.html) | Final 2025 publication | 2026-11-03 |
| nist-auth | [NIST SP 800-63B-4, section 3.2.3](https://pages.nist.gov/800-63-4/sp800-63b.html) | Final 2025 publication; voice comparison excluded from conformant authentication | 2026-11-03 |
| global-bank | [Monzo: identity checks during account opening](https://monzo.com/help/opening-an-account/how-to-open-a-Monzo-Personal-Account) | Live UK personal-account help | 2026-11-03 |
| phone | [NatWest Premier: Voice ID](https://www.natwest.com/premier-banking/contact-us.html) | Live telephone-banking service page | 2026-11-03 |
| phone-retired | [HSBC HK: Voice ID withdrawal notice](https://www.hsbc.com.hk/important-notices/) | Phone Voice ID support ended August 18, 2024; excluded as a current-use example | 2026-11-03 |
| kyc-time | [Standard Chartered India Video KYC FAQ](https://www.sc.bank.in/video-kyc/) | Provider estimate: about 6 minutes for the process, under 15 including subsequent agent checks | 2026-11-03 |
| patient | [WHO Patient Identification safety solution](https://cdn.who.int/media/docs/default-source/patient-safety/patient-safety-solutions/ps-solution2-patient-identification.pdf) | May 2007 safety guidance; no claim of current biometric deployment | 2026-11-03 |
| event | [Ticketmaster mobile-ticket entry FAQ](https://www.ticketmaster.com/mobile-tickets) | Live provider FAQ; encrypted tickets are an alternative to biometric entry | 2026-11-03 |

## Reproduction and limitations

Structured source and scenario data: `web/src/data/use-cases.json`. The static page imports this local file; visiting it does not fetch third-party source content. Source links are reader-initiated. The matrix and notes are qualitative research, not model benchmarks. Original measured evidence and its uncertainty remain unchanged. Sources were inspected through official pages/PDFs; inaccessible browser fetches for IRDAI/PFRDA were checked with direct official-host HTTP downloads. Local retrieval notes are ignored under `.overnight/m4-*`.
