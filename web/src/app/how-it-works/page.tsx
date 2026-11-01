import type { Metadata } from "next";
import manifest from "../../../public/models/manifest.json";
export const metadata: Metadata = {
  title: "How it works",
  description:
    "Preprocessing, model attribution, fusion rules and local Flask API mode.",
};
export default function Architecture() {
  return (
    <>
      <header className="page-heading wrap">
        <p className="eyebrow">ENGINEERING / ARCHITECTURE</p>
        <h1>Every stage, in the open.</h1>
        <p className="lead">
          The browser and local gateway share the same model logic.
          Preprocessing and decisions are checked against executable references.
        </p>
      </header>
      <article className="prose wrap">
        <section>
          <h2>The three pipelines</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Check</th>
                  <th>Preprocessing → model → decision</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Face</td>
                  <td>
                    RGB → 640 × 640 letterbox → YOLOv5s-face → NMS → square
                    crop, expansion 1.5 with black padding → 128 × 128 RGB, CHW
                    / 255 → MiniFASNet → softmax class 0, live ≥ 0.5 and argmax
                    live.
                  </td>
                </tr>
                <tr>
                  <td>Document</td>
                  <td>
                    PIL-equivalent bilinear resize to 224 × 224 → CHW / 255, no
                    additional normalization → ResNet18 → softmax class 1 (real)
                    ≥ 0.5. Class order: fake, real.
                  </td>
                </tr>
                <tr>
                  <td>Voice</td>
                  <td>
                    44.1 kHz stereo int16 → pre-emphasis → rectangular frames →
                    1103-point FFT → 26 mel filters → 20 MFCC, DCT-II, lifter
                    22, log energy → population scaling → 20 deltas → enrolled
                    diagonal GMM mean log likelihood → speaker posterior ≥ 0.5
                    and best match is the claimed speaker.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="source">
            Sources: gateway/checks/face.py · gateway/checks/document.py ·
            gateway/checks/voice.py · web/src/lib/
          </p>
        </section>
        <section>
          <h2>Fusion, rule for rule</h2>
          <ol>
            <li>
              Liveness veto: the face check ran and did not find exactly one
              live face → REJECT.
            </li>
            <li>Any other check ran and failed → REJECT.</li>
            <li>
              Any check did not produce a score (not provided, module
              unavailable, error) → REVIEW. The gateway never approves on
              partial evidence.
            </li>
            <li>Weighted mean of the scores below 0.66 → REJECT.</li>
            <li>Otherwise APPROVE.</li>
          </ol>
          <p>
            Default weights are equal. The 0.66 threshold is inherited from the
            original fusion module and has not been calibrated on held-out data.
          </p>
          <p className="source">
            Sources: gateway/fusion.py · gateway/config.py ·
            web/src/lib/fusion.ts
          </p>
        </section>
        <section id="privacy">
          <h2>Privacy is an architecture choice.</h2>
          <p>
            The browser fetches static model files from the same origin. A
            dedicated worker decodes inputs and performs inference. WebGPU is
            attempted when available; WASM is the fallback. Voice features and
            GMM scoring run in JavaScript inside the worker.
          </p>
          <p>
            Model bytes are checked against SHA-256 values before inference and
            cached by hash. Images, audio and results are kept in memory. Start
            over terminates the worker, clears results and stops camera or
            microphone tracks. Downloaded receipts use an explicit field
            allowlist that excludes media.
          </p>
          <p>
            The hosting provider still receives ordinary page and asset
            requests, including network metadata such as an IP address. The
            application contains no analytics, database or remote inference
            endpoint.
          </p>
          <p className="source">
            Sources: web/src/workers/inference.worker.ts ·
            web/src/lib/receipt.ts · web/src/components/verification-flow.tsx
          </p>
        </section>
        <section>
          <h2>Local API mode</h2>
          <p>
            The Flask gateway remains available for local development and API
            experiments. Inputs sent to this mode are processed on the machine
            running Flask.
          </p>
          <pre tabIndex={0} aria-label="Local gateway commands">
            <code>{`pip install -r requirements.txt\npython -m gateway --port 5000\ncurl http://localhost:5000/api/health\ncurl -F selfie=@selfie.jpg -F document=@document.png \\\n  -F voice=@voice.wav -F claimed_identity=Raj \\\n  http://localhost:5000/api/verify`}</code>
          </pre>
          <p className="source">
            Sources: gateway/__main__.py · gateway/app.py
          </p>
        </section>
        <section>
          <h2>Model cards & provenance</h2>
          {manifest.models.map((m) => (
            <div className="model-card" key={m.file}>
              <h3>{m.file}</h3>
              <p>{m.licence_note}</p>
              <dl>
                <dt>Precision</dt>
                <dd className="mono">{m.precision}</dd>
                <dt>Size</dt>
                <dd className="mono">{m.size_bytes.toLocaleString()} bytes</dd>
                <dt>Source</dt>
                <dd className="mono">{m.source_path}</dd>
                <dt>SHA-256</dt>
                <dd className="mono">{m.sha256}</dd>
              </dl>
            </div>
          ))}
          <p className="source">Source: web/public/models/manifest.json</p>
        </section>
      </article>
    </>
  );
}
