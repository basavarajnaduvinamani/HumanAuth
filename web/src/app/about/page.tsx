import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "About the project",
  description:
    "HumanAuth team, Dayananda Sagar University, project grant and source provenance.",
};
export default function About() {
  return (
    <>
      <header className="page-heading wrap">
        <p className="eyebrow">PROJECT / PEOPLE & PROVENANCE</p>
        <h1>Built to be inspected.</h1>
        <p className="lead">
          HumanAuth began as a B.Tech major project at Dayananda Sagar
          University during 2024–25. This browser edition makes its checks and
          decisions accessible without a hosted inference server.
        </p>
      </header>
      <article className="prose wrap">
        <section>
          <h2>The project team</h2>
          <ul className="team-list">
            <li>Basavaraj A Naduvinamani</li>
            <li>Pushpa Priya N</li>
            <li>S Thriveni</li>
            <li>Sahana N</li>
          </ul>
          <p className="source">
            Source: HUMANAUTH_Complete_Signed_Project_Report.pdf, certificate
            page. Names transcribed without student identification numbers.
            Source digest: bench/results/reported_results_reference.json.
          </p>
        </section>
        <section>
          <h2>Funding & technical support</h2>
          <p>
            Project reference: <span className="mono">48S_BE_5942</span>.
          </p>
          <blockquote className="note">
            “Please note that this project has received funding from AI &
            Robotics Technology Park (ARTPark), IISc and technical support from
            KSCST.”
          </blockquote>
          <p>
            The sanction letter approves the proposal under “Student Project
            Programme - 48th Series”.
          </p>
          <p className="source">
            Sources: Archive/Major Project/funding/48S_BE_5942.pdf, instruction
            j; signed report funding details, PDF pages 44–45. Transcription and
            digests: docs/project_provenance.json.
          </p>
        </section>
        <section>
          <h2>Paper & source</h2>
          <p>IJRAR Vol 12(1), February 2025, IJRAR25A1939.</p>
          <p>
            <a href="https://github.com/basavarajnaduvinamani/HumanAuth">
              Explore the public repository ↗
            </a>
          </p>
          <p>
            The repository is distributed under the MIT licence. Upstream model
            attribution and any separately unresolved weight terms are listed on
            the architecture page.
          </p>
          <p className="source">
            Sources: docs/project_provenance.json · LICENSE ·
            web/public/models/manifest.json
          </p>
        </section>
      </article>
    </>
  );
}
