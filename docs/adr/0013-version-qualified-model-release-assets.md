# Version qualified browser model release assets

## Context
CLI uploads included generated ONNX files, but a clean Git deployment would not:
the initial export design ignored them. The requested Git auto-deploy handoff
must not depend on local files or a Python/Torch toolchain in a Node build.

## Options
A. Version the three selected public ONNX release assets with their manifest.
B. Keep them ignored and deploy generated artifacts via CLI or a separate CI
artifact-deployment pipeline and its credentials.

## Decision
Choose A. Version only the selected detector, liveness and int8 document exports.
They derive from weights already in this public repository, with unchanged
attribution and hashes; no new private model or biometric data is introduced.
Keep alternate candidates and external evaluation media ignored. The exporter
and parity CI remain available to reproduce and validate the ports. Before each
Node build, verify all manifest asset sizes and SHA-256 values locally.

## Consequences
Git history gains 41,485,879 binary bytes for these three exports. Removing later
files would not erase historical blobs. Each individual asset is under the
verified hosting and Git file limits. Clean Git deployments need only npm; the
runtime still copies from the locked onnxruntime-web dependency at build time.
This supersedes the initial generated-only ONNX distribution choice in ADR 0001
and the corresponding Git note in ADR 0008. The browser pipeline is unchanged.
