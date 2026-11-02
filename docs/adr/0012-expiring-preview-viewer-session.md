# Use an expiring viewer session for cross-browser preview QA

## Context
OIDC request/context headers completed Chromium and WebKit inference, but Firefox
still stalled during protected worker startup. Native browser cookie transport
completed all three sample flows. Deployment protection must remain enabled.

## Options
A. Continue per-engine header interception.
B. Create a short-lived viewer link, establish a host-scoped cookie in memory,
run native browser requests, and revoke the link immediately afterward.

## Decision
Choose B. The CLI helper verifies the deployment's linked project, hostname,
Ready state and preview target before requesting a 1,800-second viewer link.
The link and cookie stay in process memory; no URL containing the secret, env
file, browser storage state or credential value is written to disk. Browser
cookies are constrained to the exact preview host. Trace recording is disabled.
The helper redacts credential strings from captured output and checks the JSON
report, failing the gate if a credential is found. Revocation runs in `finally`.

## Consequences
All existing model, privacy, error and accessibility assertions stay intact.
This tests ordinary protected-browser behavior without disabling protection or
changing inference threading. The access audit records only scope, requested
expiry, revocation and exit status. The public production flow is tested without
this setup. The earlier transport experiments and hydration defect remain in
the task report rather than being hidden by retries or relaxed assertions.
