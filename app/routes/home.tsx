import { useEffect } from "react";
import type { Route } from "./+types/home";
import { getToken } from "../features/auth/auth";

const siteOrigin = "https://mordheim.hughlett.org";
const pageTitle = "Mordheim Warband Roster Builder & Campaign Tracker";
const pageDescription =
  "Build and manage Mordheim warbands. Track campaign battles, injuries, experience, skills, spells and equipment, then export a print-ready roster with Mordheim Roster Ledger.";

export function meta({}: Route.MetaArgs) {
  return [
    { title: pageTitle },
    { name: "description", content: pageDescription },
    { name: "robots", content: "index, follow" },
    { tagName: "link", rel: "canonical", href: siteOrigin },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Mordheim Roster Ledger" },
    { property: "og:title", content: pageTitle },
    { property: "og:description", content: pageDescription },
    { property: "og:url", content: siteOrigin },
    { property: "og:locale", content: "en_US" },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: pageTitle },
    { name: "twitter:description", content: pageDescription },
  ];
}

const features = [
  {
    number: "01",
    title: "Build a complete warband",
    description:
      "Organize Heroes, Henchmen and Hired Swords in one Mordheim roster, with their stats, equipment and campaign details together.",
  },
  {
    number: "02",
    title: "Keep campaign progress",
    description:
      "Record battles, treasury and wyrdstone while tracking each warrior’s experience, advances, skills, spells and injuries.",
  },
  {
    number: "03",
    title: "Manage gear and trading",
    description:
      "Keep equipment with the warriors who carry it, manage your inventory, and record purchases as your warband develops.",
  },
  {
    number: "04",
    title: "Print or save as PDF",
    description:
      "Create a readable roster for your next game. Use your browser’s print dialog to print it or save a PDF.",
  },
];

export default function Home() {
  useEffect(() => {
    if (getToken() || new URLSearchParams(window.location.search).has("share")) {
      window.location.replace(`/app${window.location.search}${window.location.hash}`);
    }
  }, []);

  return (
    <div className="landing-page">
      <header className="landing-header">
        <a className="landing-brand" href="/" aria-label="Mordheim Roster Ledger home">
          <span className="landing-brand-mark" aria-hidden="true">M</span>
          <span>
            <strong>MORDHEIM</strong>
            <small>ROSTER LEDGER</small>
          </span>
        </a>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a className="landing-nav-cta" href="/app">Sign in</a>
        </nav>
      </header>

      <main>
        <section className="landing-hero">
          <p className="landing-eyebrow">A fan-made campaign companion</p>
          <h1>Mordheim warband rosters, ready for the next battle.</h1>
          <p className="landing-intro">
            Build and manage your warband roster, keep campaign progress in one
            place, and bring a print-ready record to the tabletop.
          </p>
          <div className="landing-actions">
            <a className="landing-button landing-button-primary" href="/app">
              Open the roster app <span aria-hidden="true">→</span>
            </a>
            <a className="landing-text-link" href="#features">Explore features</a>
          </div>
          <p className="landing-note">For organizing your campaign—not a replacement for the rulebook or tabletop play.</p>
        </section>

        <section className="landing-features" id="features" aria-labelledby="features-title">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">Your campaign, in one ledger</p>
            <h2 id="features-title">A Mordheim roster builder and campaign tracker</h2>
            <p>
              Keep your warband’s changing details together, from its first
              recruits to the aftermath of each battle.
            </p>
          </div>
          <div className="landing-feature-grid">
            {features.map((feature) => (
              <article className="landing-feature" key={feature.number}>
                <span className="landing-feature-number">{feature.number}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-how" id="how-it-works" aria-labelledby="how-title">
          <div>
            <p className="landing-eyebrow">From roster to tabletop</p>
            <h2 id="how-title">Spend less time looking for notes.</h2>
          </div>
          <ol className="landing-steps">
            <li><span>1</span><p><strong>Create your roster.</strong> Set up your warband and add its members.</p></li>
            <li><span>2</span><p><strong>Update it between battles.</strong> Record campaign changes and keep warrior details current.</p></li>
            <li><span>3</span><p><strong>Take it to the table.</strong> Print your roster or save a copy as a PDF.</p></li>
          </ol>
        </section>

        <section className="landing-faq" aria-labelledby="faq-title">
          <p className="landing-eyebrow">Good to know</p>
          <h2 id="faq-title">Frequently asked questions</h2>
          <details>
            <summary>What is Mordheim Roster Ledger?</summary>
            <p>
              It is a web app for building Mordheim warband rosters and keeping
              campaign records, including warrior progress, injuries and gear.
              Players continue to resolve their games at the tabletop.
            </p>
          </details>
          <details>
            <summary>Can I print my roster or save it as a PDF?</summary>
            <p>
              Yes. The roster app prepares a print-friendly version. Choose
              “Save as PDF” in your browser’s print dialog to keep a digital copy.
            </p>
          </details>
          <details>
            <summary>Is this an official Games Workshop product?</summary>
            <p>
              No. Mordheim Roster Ledger is an independent, fan-made tool and
              is not affiliated with or endorsed by Games Workshop.
            </p>
          </details>
        </section>

        <section className="landing-end">
          <h2>Get your next warband ready.</h2>
          <p>Keep the roster organized. Keep your eyes on the streets.</p>
          <a className="landing-button landing-button-primary" href="/app">
            Open the roster app <span aria-hidden="true">→</span>
          </a>
        </section>
      </main>

      <footer className="landing-footer">
        <a className="landing-brand" href="/">
          <span className="landing-brand-mark" aria-hidden="true">M</span>
          <span><strong>MORDHEIM</strong><small>ROSTER LEDGER</small></span>
        </a>
        <p>
          An independent fan-made tool. Mordheim and related marks are the
          property of their respective owner. Not affiliated with or endorsed
          by Games Workshop.
        </p>
      </footer>
    </div>
  );
}
