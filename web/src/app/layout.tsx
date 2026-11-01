import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import { ThemeToggle } from "../components/theme-toggle";
import "./globals.css";
const sans = localFont({
  src: "../../node_modules/@fontsource/geist/files/geist-latin-400-normal.woff2",
  variable: "--font-sans",
  display: "swap",
});
const mono = localFont({
  src: "../../node_modules/@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff2",
  variable: "--font-mono",
  display: "swap",
});
export const metadata: Metadata = {
  title: {
    default: "HumanAuth — Identity checks, on your device",
    template: "%s · HumanAuth",
  },
  description:
    "Inspect face liveness, document authenticity and enrolled voice matching in your browser. Inputs stay on your device.",
  metadataBase: new URL("https://humanauth-basavarajnaduvinamani34-1831.vercel.app"),
  openGraph: {
    title: "HumanAuth — Identity checks, on your device",
    description: "Three checks. One explained decision. Inspect the evidence.",
    images: ["/og.png"],
  },
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="header-inner">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden="true">
                H<span>_</span>
              </span>
              HumanAuth
            </Link>
            <nav aria-label="Main navigation">
              <Link href="/how-it-works">How it works</Link>
              <Link href="/evidence">Evidence</Link>
              <Link href="/about">About</Link>
            </nav>
            <div className="header-actions">
              <ThemeToggle />
              <Link className="button small" href="/verify">
                Try HumanAuth <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div>
            <Link href="/" className="brand">
              HumanAuth
            </Link>
            <p>Research prototype. Decisions you can inspect.</p>
          </div>
          <div>
            <Link href="/evidence">Evidence & limits</Link>
            <a href="https://github.com/basavarajnaduvinamani/HumanAuth">
              Source on GitHub ↗
            </a>
            <span>MIT · Upstream model terms apply</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
