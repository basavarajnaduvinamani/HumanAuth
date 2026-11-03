import raw from "../data/evidence.json";
type Metrics = {
  metrics: Record<string, number>;
  ci95: Record<string, number[]>;
};
interface Evidence {
  slow_network: {
    source: string;
    data: { results: { elapsed_ms: number; model_network_requests: number }[] };
  } | null;
  face: {
    source: string;
    data: { sample_count: number; outputs: Record<string, Metrics> };
  } | null;
  document: {
    source: string;
    data: Metrics & { sample_count: number; source_groups: number };
  } | null;
  latency: {
    source: string;
    data: {
      source: string;
      warm_runs: number;
      cold_runs: number;
      hardware: { browser: string; cpu: string };
      stages: Record<
        string,
        { p50_ms: number; p95_ms: number; backend: string }
      >;
    };
  } | null;
  browser_parity: {
    source: string;
    data: {
      browser: string;
      gate: Record<
        string,
        { mode: string; max_abs_diff: number; cases: number }
      >;
    };
  } | null;
  network: {
    source: string;
    data: {
      input_upload_bytes: number;
      third_party_requests: number;
      browser: string;
      scope: string;
    };
  } | null;
}
const evidence = raw as unknown as Evidence;
const format = (v: number) => (v * 100).toFixed(2) + "%";
export function TransferMeasurements() {
  return (
    <>
      {evidence.face && (
        <>
          <h3>Face liveness: cross-domain transfer</h3>
          <p>
            Fixed balanced LCC-FASD evaluation subset:{" "}
            {evidence.face.data.sample_count} images. Same face detector and
            threshold for both models. The newer checkpoint did not improve
            ACER, so the shipped model stays.
          </p>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Face transfer metrics"
          >
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Metric</th>
                  <th>Observed</th>
                  <th>95% CI</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(evidence.face.data.outputs).flatMap(
                  ([name, r]) =>
                    Object.entries(r.metrics).map(([metric, value]) => (
                      <tr key={name + metric}>
                        <td>
                          {name === "shipped"
                            ? "Shipped MiniFASNet"
                            : "Newer MiniFAS comparator"}
                        </td>
                        <td>{metric}</td>
                        <td className="mono">{format(value)}</td>
                        <td className="mono">
                          {r.ci95[metric].map(format).join(" – ")}
                        </td>
                      </tr>
                    )),
                )}
              </tbody>
            </table>
          </div>
          <p className="note">
            Intervals use stratified image bootstrap. Identity mapping is
            absent, so repeated people or frames may make intervals too narrow.
            This is a transfer subset, not the full benchmark or a population
            estimate.
          </p>
          <p className="source">
            Source: {evidence.face.source}. Seed and selection hashes in the
            file; protocol: bench/protocol_2026.md.
          </p>
        </>
      )}
      {evidence.document && (
        <>
          <h3>Document: whole-image transfer</h3>
          <p>
            CACTUS Lab synthetic Spanish IDs, Zenodo v1.0, CC-BY-4.0:{" "}
            {evidence.document.data.sample_count} images in{" "}
            {evidence.document.data.source_groups} source-filename groups. Byte
            hashes do not overlap repository training images.
          </p>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Document transfer metrics"
          >
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Observed</th>
                  <th>95% CI</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(evidence.document.data.metrics).map(
                  ([metric, value]) => (
                    <tr key={metric}>
                      <td>{metric.replaceAll("_", " ")}</td>
                      <td className="mono">{format(value)}</td>
                      <td className="mono">
                        {evidence
                          .document!.data.ci95[metric].map(format)
                          .join(" – ")}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
          <p className="note">
            The AUC is near chance. High forged recall comes largely from
            rejecting documents, not reliable separation. This result supports
            treating whole-image scores as a demo signal. Region-crop evaluation
            is unavailable because the archives provide no validated edit-region
            boxes.
          </p>
          <p className="source">
            Source: {evidence.document.source}. Cluster bootstrap pairs filename
            stems; source correspondence is assumed from archive names.
          </p>
        </>
      )}
    </>
  );
}
export function BrowserMeasurements() {
  return (
    <>
      {evidence.browser_parity && (
        <section>
          <h2>Browser worker qualification</h2>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Browser parity"
          >
            <table>
              <thead>
                <tr>
                  <th>Check</th>
                  <th>Gate</th>
                  <th>Cases</th>
                  <th>Max difference</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(evidence.browser_parity.data.gate).map(
                  ([n, r]) => (
                    <tr key={n}>
                      <td>{n}</td>
                      <td>{r.mode}</td>
                      <td>{r.cases}</td>
                      <td className="mono">{r.max_abs_diff.toPrecision(6)}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
          <p className="source">
            Source: {evidence.browser_parity.source}. Chromium{" "}
            {evidence.browser_parity.data.browser}; only observed
            backends/devices are qualified.
          </p>
        </section>
      )}
      {evidence.latency && (
        <section>
          <h2>On-device browser latency</h2>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Browser latency"
          >
            <table>
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>p50</th>
                  <th>p95</th>
                  <th>Backend</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(evidence.latency.data.stages).map(([n, r]) => (
                  <tr key={n}>
                    <td>{n}</td>
                    <td className="mono">{r.p50_ms.toFixed(1)} ms</td>
                    <td className="mono">{r.p95_ms.toFixed(1)} ms</td>
                    <td>{r.backend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Worker-stage timings include decoding, preprocessing and inference,
            excluding capture and page rendering. Warm runs reuse sessions. Cold
            runs include downloads and session initialization.
          </p>
          <p className="source">
            Source: {evidence.latency.data.source}.{" "}
            {evidence.latency.data.warm_runs} warm runs,{" "}
            {evidence.latency.data.cold_runs} cold runs;{" "}
            {evidence.latency.data.hardware.cpu}; Chromium{" "}
            {evidence.latency.data.hardware.browser}.
          </p>
        </section>
      )}
      {evidence.network && (
        <section>
          <h2>Network privacy audit</h2>
          <p>
            The automated sample-flow test observed{" "}
            {evidence.network.data.input_upload_bytes} bytes of input uploads
            and {evidence.network.data.third_party_requests} third-party
            requests. It checks every request from landing navigation through
            verification and receipt download.
          </p>
          <p>
            Static page and model requests still reach the hosting provider.
            This test verifies application request behavior during the tested
            flow, not every browser extension or device configuration.
          </p>
          <p className="source">
            Source: {evidence.network.source}. The same request assertions run
            in the web CI job.
          </p>
        </section>
      )}
      {evidence.slow_network && (
        <section>
          <h2>Downloads on a slow connection</h2>
          <p>
            An explicit Fast 3G profile used 150 ms latency and 204,800 bytes/s
            download throughput. The first complete sample flow took{" "}
            {(evidence.slow_network.data.results[0].elapsed_ms / 1000).toFixed(
              1,
            )}{" "}
            s. The second took{" "}
            {(evidence.slow_network.data.results[1].elapsed_ms / 1000).toFixed(
              1,
            )}{" "}
            s, with{" "}
            {evidence.slow_network.data.results[1].model_network_requests} model
            downloads. Cached models avoid transfer, but runtime loading and
            session initialization still cost time. These are emulated laptop
            runs, not measurements on a physical phone.
          </p>
          <p className="source">Source: {evidence.slow_network.source}.</p>
        </section>
      )}
    </>
  );
}
