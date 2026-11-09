import Link from "next/link";
import { CheckResult } from "../lib/types";
import { fuse } from "../lib/fusion";
const labels = {
  face: "Face liveness",
  document: "Document authenticity",
  voice: "Enrolled voice match",
};
const models = {
  face: "YOLOv5s-face · MiniFASNet",
  document: "ResNet18",
  voice: "MFCC + diagonal GMM",
};
export function ResultSheet({
  results,
  mini = false,
  sample = false,
}: {
  results: CheckResult[];
  mini?: boolean;
  sample?: boolean;
}) {
  const output = fuse(results),
    title = {
      approve: "Verified",
      reject: "Not verified",
      review: "Needs review",
    }[output.decision];
  return (
    <section
      className={`result-sheet ${mini ? "mini" : ""}`}
      aria-label="Verification result"
    >
      <div className="sheet-top">
        <span className="eyebrow">Verification receipt</span>
        <span className="mono">Local session</span>
      </div>
      <div className={`decision ${output.decision}`}>
        <span className="status-symbol" aria-hidden="true">
          {output.decision === "approve"
            ? "✓"
            : output.decision === "reject"
              ? "×"
              : "—"}
        </span>
        <div>
          <h2>{title}</h2>
          <p>
            {mini
              ? "Actual bundled-sample gateway output"
              : "Every check contributes. Liveness can veto the decision."}
          </p>
        </div>
      </div>
      <div className="check-rows">
        {results.map((r) => (
          <div className="check-row" key={r.name}>
            <div className="row-heading">
              <span>{labels[r.name]}</span>
              <span
                className={`state ${r.status !== "ok" ? "review" : r.passed ? "approve" : "reject"}`}
              >
                {r.status !== "ok"
                  ? "Unavailable"
                  : r.passed
                    ? "Passed"
                    : "Failed"}
              </span>
            </div>
            <div className="row-meta">
              <span>{models[r.name]}</span>
              <span className="mono">
                {r.score === null ? "—" : r.score.toFixed(4)}
              </span>
            </div>
            <div
              className="score-track"
              role="img"
              aria-label={`Score ${r.score?.toFixed(4) ?? "unavailable"}, threshold ${r.threshold}`}
            >
              <span style={{ width: `${(r.score ?? 0) * 100}%` }} />
              <i style={{ left: `${r.threshold * 100}%` }} />
            </div>
            {!mini && (
              <>
                <p className="check-detail">{r.detail}</p>
                <div className="row-meta mono">
                  <span>
                    {r.mode === "replay"
                      ? "Replayed from the local gateway"
                      : r.backend || "Local gateway"}
                  </span>
                  <span>
                    {r.latency_ms == null
                      ? "—"
                      : `${Math.round(r.latency_ms)} ms`}
                  </span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {(mini || sample || results.some((r) => r.mode === "replay")) && (
        <p className="score-note">Score on the bundled sample, not accuracy.</p>
      )}
      {!mini && (
        <div className="reason-list">
          <h3>Why this decision</h3>
          <ul>
            {output.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="sheet-bottom">
        <span className="mono">
          {mini ? "Bundled samples" : "No media in receipt"}
        </span>
        <Link href="/evidence">
          Inspect the evidence
        </Link>
      </div>
    </section>
  );
}
