# Accept initial control input only after hydration

## Context
Hosted WebKit QA clicked the server-rendered sample button before its React
handler was attached. The page remained at Consent instead of starting the
sample, while all three engines completed inference through the viewer session.

## Options
A. Render the verification flow only on the client.
B. Keep readable SSR and disable initial controls until hydration is complete.

## Decision
Choose B. A small `useSyncExternalStore` hook returns the server snapshot during
hydration and the client snapshot afterward. Initial consent/sample controls and
the theme toggle use native disabled states until then. This adds no dependency,
timer or arbitrary test sleep. A browser regression deliberately holds JavaScript
downloads, checks the disabled SSR state, releases scripts and completes the
consent transition. Existing flow/privacy/error assertions remain unchanged.

## Consequences
The first enabled click has an attached handler even on cold loads. Text remains
server-rendered and readable. Native disabled semantics work with keyboard and
assistive technology. No model, threshold or inference behavior changes.
