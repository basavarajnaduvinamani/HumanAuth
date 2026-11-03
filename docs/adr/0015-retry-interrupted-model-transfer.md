# Bound recovery from interrupted model transfer

## Context
The first hosted hydration-fixed run passed 17/18 tests. Firefox's sample flow
stopped at Face with `Error in input stream`; a separate fresh Firefox run then
completed unchanged. The app caught fetch rejection but not response-body read
failure. This is consistent with an intermittent transport failure; the exact
network cause was not established.

## Options
A. Keep the existing manual retry after the error.
B. Retry once on fetch or response-stream failure before showing a designed error.

## Decision
Use B. Discard all partial bytes, reset progress and fetch again using reload
cache semantics. Bound total attempts to two. HTTP status errors still surface
directly. Verify the final length and SHA-256 as before; cache only verified
complete bytes. Add tests for a partial stream then recovery, and bounded offline
failure. Do not add test retries or relax browser/privacy assertions.

## Consequences
One extra same-origin model GET can occur after an interrupted transfer. Repeated
failure remains actionable. Model assets, preprocessing, thresholds and results
are unchanged; previous latency and evaluation claims remain scoped to their
original runs. A full new preview and all hosted gates are required.
