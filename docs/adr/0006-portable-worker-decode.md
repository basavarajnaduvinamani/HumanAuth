# Portable image decoding inside the inference worker

## Context
Chromium and Firefox passed the complete sample and privacy suite. Windows WebKit lacks OffscreenCanvas in dedicated workers, failing at the image-decoding boundary before inference. The product must keep computation off the UI thread.

## Options
A. Use main-thread native canvas decoding as a WebKit fallback.
B. Bundle local JavaScript PNG/JPEG decoders and a local WebP WASM decoder inside the worker.

## Decision
Choose B: fast-png, jpeg-js and @jsquash/webp. Keep all resize, crop, model and fusion logic unchanged. Apply byte and dimension checks, preserve RGB channels without alpha compositing, and rerun browser parity. Decoder dependencies and their exact versions are pinned in the web lockfile.

## Consequences
No dependency on worker OffscreenCanvas or external decoding services. PNG fixture pixels remain exact; JPEG decoders can differ and require qualification before broad parity claims. WebP decoding loads a bundled same-origin WASM asset. Test permission mocks must create a mediaDevices object where the test engine lacks the native API; production still shows a designed unsupported-camera message.
