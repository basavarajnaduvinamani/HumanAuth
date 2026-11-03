import { Arrow } from "../../components/arrow";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "About the author",
  description:
    "Basavaraj A Naduvinamani, HumanAuth project origin, grant and source provenance.",
};
export default function About() {
  return (
    <>
      <header className="page-heading wrap">
        <p className="eyebrow">PROJECT / AUTHOR & PROVENANCE</p>
        <h1>Basavaraj A Naduvinamani</h1>
        <p className="lead">
          Data Science & AI master’s student. HumanAuth began as a B.Tech CSE
          major project at Dayananda Sagar University during 2024–25. This
          browser edition makes its checks and decisions accessible on your
          device.
        </p>
      </header>
      <article className="prose wrap">
        <section>
          <h2>The author</h2>
          <p>
            Built by{" "}
            <a href="https://github.com/basavarajnaduvinamani">
              Basavaraj A Naduvinamani
            </a>
            .
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
          <h2>Source & licence</h2>
          <p>
            <a href="https://github.com/basavarajnaduvinamani/HumanAuth">
              Explore the public repository <Arrow direction="external" />
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
