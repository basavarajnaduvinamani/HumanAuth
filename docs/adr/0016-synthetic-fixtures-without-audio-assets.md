# Generate synthetic fixtures without committed audio

## Context
Personal recordings, enrollment GMMs, exported parameters and face templates
must be removed. The owner also requires no audio files in Git or built output,
reproducible synthetic speech, unchanged design and a visitor model budget below
60 MB. Relabeling personal data is not replacement.

## Options
A. Generate neural-TTS speech offline and publish audio fixtures.
B. Generate speech locally and in browser memory using a licensed Flite WASI
artifact; publish the synthesizer, not its audio output.

## Decision
Choose B. The audited @echogarden/flite-wasi package is version 0.1.1; retain its
full permissive CMU/BSD-like collection COPYING and file-specific notices.
Its 21,530,456-byte WASM artifact compresses to 14,513,567 bytes using the recorded
gzip recipe. With the prior artifact set the preliminary sum is 56,084,937 bytes;
the actual release manifest must be measured again after replacement/upgrades.
Record both transfer and resident bytes. Decompression changes no synthesis
weights. Use pinned @bjorn3/browser_wasi_shim 0.4.2 (MIT OR Apache-2.0) for a
browser filesystem that stays in memory. Python fixtures invoke the same WASM
under Node WASI, writing synthetic WAVs only to ignored/temporary test storage.

Fictional generated face fixtures have independent provenance and SHA hashes.
They are not photographs of the owner or teammates. Tests and parity must be
rebuilt on these inputs; they are not held-out accuracy evidence.

## Consequences
No audio recording or old enrollment is renamed or reused. Preserve public
academic-record images as the owner directed; separately audit their CC BY 4.0
source and split leakage. Interim synthetic fixture compatibility is not an
upgrade claim for visitor speaker verification: M5-C and M3 must implement and
qualify that product. History and immutable deployments remain separate surfaces
with the owner's explicit purge and production gates.

## Sources
- https://github.com/echogarden-project/flite-wasi
- https://www.npmjs.com/package/@echogarden/flite-wasi
- https://github.com/festvox/flite/blob/master/COPYING
- https://www.npmjs.com/package/@bjorn3/browser_wasi_shim
- Local audit: .overnight/flite-package.json and package-audit/.
