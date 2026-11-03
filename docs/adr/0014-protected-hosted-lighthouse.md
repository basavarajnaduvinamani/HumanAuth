# Audit the protected deployed preview

## Context
The launch requires fresh Lighthouse measurements before production. A local
copy would not measure the hosted preview, which has Vercel Authentication.

## Options
A. Audit an equivalent local production build.
B. Reuse the revocable preview viewer session for hosted Lighthouse.

## Decision
Use B. The existing helper verifies the linked project and Ready preview, grants
30-minute viewer access and revokes it in finally. An allowlisted Lighthouse
mode injects the host-scoped cookie into Chrome's default CDP context in memory.
No profile is reused or exported. Reports redact credential values before
writing; the parent also checks artifacts. Assert final origin and path so a
login page cannot be accepted as an application audit.

## Consequences
Protection remains enabled. Lighthouse disables its initial storage reset only
for protected runs so it retains the access cookie; each audit still starts a
new browser, without app caches. The summary records this configuration. Public
production runs retain the normal storage-reset behavior. Product model,
evaluation and accuracy claims are unchanged.
