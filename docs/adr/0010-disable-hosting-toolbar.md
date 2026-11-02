# Disable injected hosting toolbar scripts

## Context
The protected preview injected `https://vercel.live/_next-live/feedback/feedback.js`.
The application CSP blocked it, but the strict audit records attempted requests
too. The owner requests no third-party origins or analytics.

## Options
A. Retain the toolbar and rely on CSP to block its script.
B. Disable the project's preview and production feedback toolbar.

## Decision
Choose B using the documented project API fields `enablePreviewFeedback: false`
and `enableProductionFeedback: false`. Preserve Vercel Authentication. Redeploy
the preview, then rerun unchanged privacy assertions. Source:
https://vercel.com/docs/rest-api/projects/update-an-existing-project.

## Consequences
No resource, environment secret, domain or paid feature is added. The unchanged
authentication setting and both disabled toolbar flags are recorded in
`bench/results/web_hosting_privacy_settings.json`. The setting is reversible.
