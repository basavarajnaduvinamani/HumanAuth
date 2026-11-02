# Preserve byte-exact model release assets

## Context
Release SHA-256 and length checks must survive clean checkouts across Windows and
Linux. Automatic text line-ending conversion can change JSON model bytes while
leaving numeric parameters unchanged. Regenerating before checking can hide a
bad committed release.

## Options
A. Let Git normalize model JSON and check only regenerated output.
B. Preserve public/models bytes, emit canonical UTF-8/LF and check committed
assets before export in CI.

## Decision
Use B. A scoped .gitattributes rule disables text conversion for release assets.
New synthetic JSON is written with explicit LF. CI checks the committed manifest
before re-export; its normal export/parity/build gates still follow.

## Consequences
Transport hashes describe exact delivered bytes. Numeric inference parameters
are not altered. Source code and other documentation keep their normal text
handling. Existing published model-byte claims remain historical; measure each
new release from its actual manifest.
