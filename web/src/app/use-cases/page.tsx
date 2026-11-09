import type { Metadata } from "next";
import data from "../../data/use-cases.json";

export const metadata: Metadata = {
  title: "Where identity checks are used",
  description:
    "Primary-source banking and governance workflows, modality differences and proposed local research studies.",
};

type SourceKey = keyof typeof data.sources;
function Sources({ ids }: { ids: string[] }) {
  return (
    <p className="source">
      {ids.map((id, index) => {
        const source = data.sources[id as SourceKey];
        return (
          <span key={id}>
            {index > 0 ? " · " : "Source: "}
            <a href={source.url}>{source.title}</a>
          </span>
        );
      })}
    </p>
  );
}

export default function UseCases() {
  const groups = [...new Set(data.cases.map((item) => item.group))];
  return (
    <>
      <header className="page-heading wrap">
        <p className="eyebrow">Context: banking and governance first</p>
        <h1>Where identity checks are used</h1>
        <p className="lead">
          HumanAuth is a research demo; these are settings where face, voice and
          document checks are used, and what an on-device design would change.
        </p>
      </header>
      <article className="prose wrap">
        <section>
          <h2>Settings this could help with</h2>
          <p>
            Identity checks come up in the settings below. They are listed as
            places to study; HumanAuth is not used in, approved for or
            compliant with any of them.
          </p>
          <ul>
            <li>
              <a href="#bank-onboarding">Bank e-KYC</a>
            </li>
            <li>
              <a href="#insurance">Video KYC</a> (live video identification
              with an official; see also{" "}
              <a href="#bank-onboarding">bank account opening</a>)
            </li>
            <li>
              <a href="#sim">Telecom SIM onboarding</a>
            </li>
            <li>
              <a href="#pension">Pensioner life certificates</a>
            </li>
            <li>
              <a href="#welfare">Government service access</a>
            </li>
            <li>
              <a href="#exam">Exam candidate verification</a>
            </li>
            <li>
              <a href="#gig">Gig-worker onboarding</a>
            </li>
          </ul>
        </section>
        <section>
          <h2>Different workflows, different evidence</h2>
          <p>
            Primary sources checked on {data.checked_on}. Video-call audio is
            distinct from voice-biometric comparison. The table describes the
            cited routes; it does not imply every organisation uses all three
            checks.
          </p>
          <p>
            Local matching is a possible research step. It does not establish
            legal identity, validate an issuer’s records or decide access to
            money, benefits or services.
          </p>
        </section>
        {groups.map((group) => (
          <section key={group}>
            <h2>{group}</h2>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label={`${group} modality comparison`}
            >
              <table>
                <caption>{group}: modalities in the cited workflow</caption>
                <thead>
                  <tr>
                    <th scope="col">Setting / who verifies whom</th>
                    <th scope="col">Face</th>
                    <th scope="col">Voice</th>
                    <th scope="col">Document</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cases
                    .filter((item) => item.group === group)
                    .map((item) => (
                      <tr key={item.id}>
                        <th scope="row">
                          <a href={`#${item.id}`}>{item.title}</a>
                          <br />
                          {item.who}
                        </th>
                        <td>{item.face}</td>
                        <td>{item.voice}</td>
                        <td>{item.document}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {data.cases
              .filter((item) => item.group === group)
              .map((item) => (
                <div key={item.id} id={item.id}>
                  <h3>{item.title}</h3>
                  <p>
                    <strong>Problem addressed:</strong> {item.risk}
                  </p>
                  <p>
                    <strong>Possible local study:</strong> {item.possibility}{" "}
                    {item.boundary}
                  </p>
                  <Sources ids={item.sources} />
                </div>
              ))}
          </section>
        ))}
        <section>
          <h2>Entry scenarios to study</h2>
          <p>
            These are proposed research scenarios, not deployments. The pension
            or welfare service desk is the lead scenario: an attendant reviews a
            repeat match and offers an assisted alternative. A failed research
            check must never deny a benefit.
          </p>
          {data.entry_scenarios.map((item) => (
            <div key={item.id}>
              <h3>{item.title}</h3>
              <p>
                <strong>Registration:</strong> {item.registers}
              </p>
              <p>
                <strong>Return visit:</strong> {item.verifies}
              </p>
              <p>
                <strong>Risk:</strong> {item.risk} {item.proposal}
              </p>
              <Sources ids={item.sources} />
            </div>
          ))}
        </section>
        <section>
          <h2>Timing needs a comparable task</h2>
          <p>
            Standard Chartered India estimates about six minutes for its Video
            KYC process and under fifteen minutes including subsequent agent
            checks. That is a provider estimate for regulated onboarding, not an
            industry average or the same task as a local repeat match.
          </p>
          <p>
            Physical-device timings for HumanAuth’s new registration and
            repeat-verification flow are pending. There is no measured speed-up
            claim.
          </p>
          <Sources ids={["kyc-time"]} />
        </section>
        <section>
          <h2>Source scope and alternatives</h2>
          <p>
            The RBI commercial-bank directions were updated on October 1, 2026;
            the earlier 2016 framework is historical context. SEBI’s May 2024
            FAQ and IRDAI’s 2022 guideline describe workflows, rather than a
            complete ledger of later legal amendments. NTA’s cited document is a
            procurement specification. WHO’s patient-identification guidance
            dates to 2007.
          </p>
          <p>
            HSBC Hong Kong ended its phone Voice ID service on August 18, 2024,
            so it is excluded as a current example. NIST SP 800-63B-4 excludes
            voice comparison from conformant authentication; the NatWest example
            describes a separate provider service. Neither validates this
            prototype.
          </p>
          <Sources ids={["rbi-history", "phone-retired", "nist-auth"]} />
          <p>
            Issued digital credentials, physical badges and encrypted tickets
            can be better choices than collecting biometrics. Any real pilot
            would need a lawful basis, trustworthy enrollment, accessible
            alternatives, independent security review and the responsible
            institution’s approval.
          </p>
        </section>
      </article>
    </>
  );
}
