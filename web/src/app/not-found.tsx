import Link from "next/link";
export default function NotFound() {
  return (
    <section className="wrap not-found">
      <p className="eyebrow">404 / PAGE NOT FOUND</p>
      <h1>This path ends here.</h1>
      <p className="lead">
        The verification flow and its evidence are still here.
      </p>
      <div className="actions">
        <Link className="button" href="/">
          Back to HumanAuth →
        </Link>
        <Link href="/verify">Open verification</Link>
      </div>
    </section>
  );
}
