import Link from "next/link";
import { PipelineMobile } from "../components/pipeline-mobile";
import { ResultSheet } from "../components/result-sheet";
import replay from "../../public/samples/replay.json";
import { CheckResult } from "../lib/types";
export default function Home() {
  return (
    <>
      <section className="hero wrap">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="tiny-square" /> IDENTITY, WITH THE WORK SHOWN
          </p>
          <h1>
            Your identity checks.
            <br />
            <span>Your device.</span>
          </h1>
          <p className="lead">
            Face liveness, document authenticity and a voice match. A decision
            you can inspect, without uploading your inputs.
          </p>
          <div className="actions">
            <Link className="button" href="/verify?sample=1">
              Try it with sample data <span aria-hidden="true">→</span>
            </Link>
            <Link className="text-button" href="/verify?camera=1">
              Use my camera ↗
            </Link>
          </div>
          <p className="caption">No account. No API key. Samples included.</p>
        </div>
        <div className="hero-preview">
          <div className="preview-label">
            <span className="mono">PRODUCT / RESULT</span>
            <span>Bundled samples</span>
          </div>
          <ResultSheet
            results={
              [replay.face, replay.document, replay.voice] as CheckResult[]
            }
            mini
          />
          <p className="preview-note">
            The SPECIMEN is rejected. The sample flow shows why.
          </p>
        </div>
      </section>
      <section className="credentials wrap">
        <span className="eyebrow">BUILT AS A STUDENT PROJECT</span>
        <div>
          <p>
            Dayananda Sagar University <span className="separator">/</span>{" "}
            B.Tech · 2024–25 <span className="separator">/</span> KSCST Student
            Project Programme
          </p>
          <p className="caption">
            Please note that this project has received funding from AI &amp;
            Robotics Technology Park (ARTPark), IISc and technical support from
            KSCST.
          </p>
        </div>
        <Link href="/about">Project provenance ↗</Link>
      </section>
      <section className="section wrap pipeline-section">
        <div className="section-heading">
          <p className="eyebrow">01 / THE DECISION PATH</p>
          <h2>
            Three signals.
            <br />
            One explicit set of rules.
          </h2>
          <p>
            A high average cannot hide a failed liveness check. Missing evidence
            goes to review.
          </p>
        </div>
        <div className="pipeline">
          <PipelineMobile />
          <svg
            className="pipeline-desktop"
            viewBox="0 0 720 250"
            role="img"
            aria-labelledby="pipeline-title"
          >
            <title id="pipeline-title">
              Face, document and voice checks feed a liveness veto, weighted
              fusion and an explained decision.
            </title>
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M190 45H255V125H300M190 125H300M190 205H255V125M440 125H480M600 125H638" />
              <rect x="10" y="15" width="180" height="60" rx="6" />
              <rect x="10" y="95" width="180" height="60" rx="6" />
              <rect x="10" y="175" width="180" height="60" rx="6" />
              <rect x="300" y="95" width="140" height="60" rx="6" />
              <rect x="480" y="95" width="120" height="60" rx="6" />
            </g>
            <g fill="currentColor" fontSize="15" textAnchor="middle">
              <text x="100" y="51">
                Face liveness
              </text>
              <text x="100" y="131">
                Document
              </text>
              <text x="100" y="211">
                Voice match
              </text>
              <text x="370" y="131">
                Liveness veto
              </text>
              <text x="540" y="131">
                Fusion
              </text>
              <text x="679" y="131">
                Decision
              </text>
            </g>
          </svg>
          <Link href="/how-it-works">Read the architecture and rules ↗</Link>
        </div>
      </section>
      <section className="privacy-band">
        <div className="wrap privacy-grid">
          <div>
            <p className="eyebrow">02 / THE PRIVACY CHOICE</p>
            <h2>
              The models travel.
              <br />
              Your inputs stay.
            </h2>
          </div>
          <div>
            <p className="lead">
              Your browser downloads the models, then runs the checks in a
              worker. Camera frames, document images and voice samples stay in
              memory on your device.
            </p>
            <p>
              Only model files are cached. Start over clears the session and
              stops capture. A downloaded receipt contains scores and model
              hashes, with no images or audio.
            </p>
            <Link href="/how-it-works#privacy">
              Inspect the privacy design ↗
            </Link>
          </div>
        </div>
      </section>
      <section className="section wrap closing">
        <div>
          <p className="eyebrow">03 / EVIDENCE BEFORE CLAIMS</p>
          <h2>
            A result is only as useful
            <br />
            as its limits are clear.
          </h2>
        </div>
        <div>
          <p>
            The document model was trained on region crops. Voice matching is
            closed-set. Thresholds are uncalibrated. The evidence page separates
            measurements from the original report.
          </p>
          <Link className="button secondary" href="/evidence">
            Read the evidence <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
