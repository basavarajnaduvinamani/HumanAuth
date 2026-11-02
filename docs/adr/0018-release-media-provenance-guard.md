# Require reviewed media provenance in source and releases

## Context
Removing personal biometric fixtures must prevent their accidental return while
retaining the owner-confirmed public academic-record dataset. A filename scan
alone misses renamed content and embedded notebook outputs.

## Options
A. Ban only known filenames and audio extensions.
B. Combine paths, extensions, media signatures, known private hashes, notebook
output checks, and SHA-256 provenance review of every raster image.

## Decision
Use B for tracked files, all public assets, and built static/page output. Synthetic
speech is generated in memory; no audio asset is allowlisted. Public academic
records remain a separately labelled CC BY 4.0 source, never a website sample.

## Consequences
New images and changes to reviewed images require a deliberate provenance entry.
This is a regression safeguard, not a claim to recognize faces or detect every
possible encoding. Historical removal and deployment retirement remain separate
operations, with the history rewrite awaiting the owner's explicit word.
