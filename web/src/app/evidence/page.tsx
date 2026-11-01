import type { Metadata } from "next";
import {
  TransferMeasurements,
  BrowserMeasurements,
} from "../../components/evidence-measurements";
import manifest from "../../../public/models/manifest.json";
export const metadata: Metadata = {
  title: "Evidence & limits",
  description:
    "Measured parity, original report provenance, benchmark conditions and known limitations.",
};
export default function Evidence() {
  return (
    <>
      <header className="page-heading wrap">
        <p className="eyebrow">EVIDENCE / MEASUREMENTS & LIMITS</p>
        <h1>Claims with a source.</h1>
        <p className="lead">
          Measurements, reported results and open questions belong in separate
          rows. HumanAuth is a research prototype, not a certified identity
          service.
        </p>
      </header>
      <article className="prose wrap">
        <section>
          <h2>Measured in 2026</h2>
          <TransferMeasurements />
          <p className="source">Protocol: bench/protocol_2026.md</p>
        </section>
        <section>
          <h2>Cross-runtime implementation parity</h2>
          <p>
            Each check uses a bundled input and generated variants. GO requires
            every decision to match and a maximum absolute score difference of
            0.02 or less. This establishes agreement on fixtures; it does not
            measure fraud-detection accuracy.
          </p>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Measurement table"
          >
            <table>
              <thead>
                <tr>
                  <th>Check</th>
                  <th>Node gate</th>
                  <th>Cases</th>
                  <th>Observed max difference</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(manifest.parity).map(([name, r]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{r.mode}</td>
                    <td>{r.cases}</td>
                    <td className="mono">{r.max_abs_diff.toPrecision(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="source">
            Sources: bench/results/web_parity.json ·
            bench/results/web_parity.md. Node CPU, same RGB/PCM bytes; browser
            qualification is a separate gate.
          </p>
          <p>
            Image variants change size, JPEG quality and brightness. Audio
            variants use deterministic gain and trimming. No threshold was
            fitted to these inputs.
          </p>
        </section>
        <section>
          <h2>Gateway CPU latency</h2>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Measurement table"
          >
            <table>
              <thead>
                <tr>
                  <th>Hardware</th>
                  <th>Warm requests</th>
                  <th>p50</th>
                  <th>p95</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Intel Xeon @ 2.80 GHz</td>
                  <td>50</td>
                  <td className="mono">524.62 ms</td>
                  <td className="mono">1506.02 ms</td>
                </tr>
                <tr>
                  <td>Intel Core i5-12450H</td>
                  <td>50</td>
                  <td className="mono">1052.28 ms</td>
                  <td className="mono">1215.62 ms</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            In-process multipart request through the Flask gateway, excluding
            capture, network transfer and browser rendering. These are gateway
            timings, not browser latency claims.
          </p>
          <p className="source">
            Sources: bench/results/latency_cpu.json ·
            bench/results/latency_cpu_12th_gen_intel_r_core_tm_i5_12450h_20261030T161355969061Z.json
          </p>
        </section>
        <BrowserMeasurements />
        <section>
          <h2>Original 2024 report</h2>
          <p>
            96.5% integrated and 96.0% face anti-spoofing (scope not
            identified), and 98.5% as document TRAINING accuracy.
          </p>
          <p>
            These are signed-report figures, not measurements from this browser
            product.
          </p>
          <p className="source">
            Source: bench/results/reported_results_reference.json. Signed report
            pages 30–31; digest recorded in the source file.
          </p>
        </section>
        <section>
          <h2>Known limits</h2>
          <ul>
            <li>
              Document validation and test splits share source pages with
              training. Their apparent accuracy is not held-out generalization.
            </li>
            <li>
              The document classifier was trained on annotated region crops.
              Whole-document scores are a demo signal.
            </li>
            <li>
              Voice is closed-set speaker matching against Raj and Sahana, not
              deepfake detection. Unknown speakers are still assigned to the
              nearest enrollment.
            </li>
            <li>
              The fusion threshold of 0.66 is not calibrated on held-out data.
            </li>
            <li>
              Face liveness does not match a visitor’s face to the photograph on
              their ID.
            </li>
            <li>
              The bundled SPECIMEN is rejected; sample mode demonstrates the
              decision path rather than guaranteeing approval.
            </li>
            <li>
              Upstream MiniFASNet and YOLOv5-face checkpoints are not the team’s
              trained models. Upstream weight rights are recorded separately
              from the repository MIT licence.
            </li>
          </ul>
          <p className="source">
            Sources: README.md · gateway/checks/document.py ·
            gateway/checks/voice.py · gateway/fusion.py ·
            bench/results/doc_class_map.json · web/public/models/manifest.json
          </p>
        </section>
      </article>
    </>
  );
}
