# Authenticate preview QA without persisting credentials

## Context
The preview uses Vercel Authentication. Hosted QA must exercise the real browser
flow without disabling protection, adding application secrets or retaining tokens.

## Options
A. Disable preview protection or save a reusable browser session.
B. Inject a short-lived project OIDC token into the test process and scope it to
the exact preview origin.

## Decision
Choose B. Use the authenticated CLI's `env run` command; on this Windows host,
`vercel.cmd` preserves the `--` command separator that the PowerShell wrapper
consumed. Context headers cover nested ONNX module workers. A request-route guard
blocks every other origin and strips inherited headers before fulfilling allowed
requests. Fetch redirects separately with `maxRedirects: 0`. First assert the
deployed same-origin script, worker and connection CSP, which also constrains
nested-worker requests that Playwright does not route. Open no other site in
that browser context.
Do not log fetch diagnostics that may contain headers. Disable Playwright traces
when the token is present. No environment file, browser storage state or token
value is written to the repository or supplied as a process argument.

## Consequences
Protected-preview QA has an authentication transport wrapper, so it is functional
validation rather than a comparable latency benchmark. Same-origin, request-body,
receipt and accessibility assertions remain unchanged. Local/CI runs without the
token use the original browser transport. The deployment audit also verifies
HTTPS isolation, model hashes and a synthetic camera lifecycle; physical hardware
and human interaction with permission prompts remain separate owner checks.

The initial route-only header approach left nested workers unauthenticated and
the sample stalled during session setup. An OIDC request did not issue a bypass
cookie, so no cookie solution or saved session was claimed. Context headers plus
the origin guard restored the actual multithreaded flow without changing model
execution or relaxing assertions. Public production is tested without this
authentication transport wrapper.
