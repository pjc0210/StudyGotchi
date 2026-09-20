"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { ProductHeader } from "@/components/shell/ProductHeader";
import { useReducedMotion } from "@/components/shell/useSpaceAttribute";
import { SITE_GATED } from "@/lib/config";
import {
  LANDING_BODY,
  LANDING_CONNECTS_LEAD,
  LANDING_EYEBROW,
  LANDING_FOOTER,
  LANDING_HEADLINE,
  LANDING_INTEGRATIONS,
  LANDING_ONTOLOGY_NOTE,
  LANDING_PROMISES,
  LANDING_SECTIONS,
  landingCta,
  landingSecondaryCta,
} from "@/lib/landing-copy";

function PrimaryCta({ signedIn }: { signedIn: boolean }) {
  const cta = landingCta({ gated: SITE_GATED, signedIn });
  return (
    <Link
      className="sg-btn sg-btn-primary sg-btn-lg"
      href={cta.href}
      transitionTypes={cta.href === "/earth" ? ["enter-world"] : undefined}
    >
      {cta.label}
    </Link>
  );
}

function SecondaryCta({ reduced }: { reduced: boolean }) {
  const cta = landingSecondaryCta();
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(LANDING_SECTIONS.how);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", cta.href);
  };
  return (
    <a className="sg-btn sg-btn-text sg-btn-lg sg-landing-secondary" href={cta.href} onClick={onClick}>
      {cta.label}
    </a>
  );
}

export function Landing() {
  const reduced = useReducedMotion();

  return (
    <div className="sg-landing">
      <ProductHeader variant="landing" />

      <main className="sg-landing-main">
        <section className="sg-hero" aria-labelledby="sg-hero-title">
          <span className="sg-eyebrow sg-landing-eyebrow">{LANDING_EYEBROW}</span>
          <h1 id="sg-hero-title" className="sg-display sg-landing-display">
            {LANDING_HEADLINE}
          </h1>
          <p className="sg-body sg-landing-lead">{LANDING_BODY}</p>
          <div className="sg-hero-actions">
            {SITE_GATED ? (
              <>
                <SignedOut>
                  <PrimaryCta signedIn={false} />
                </SignedOut>
                <SignedIn>
                  <PrimaryCta signedIn />
                </SignedIn>
              </>
            ) : (
              <PrimaryCta signedIn />
            )}
            <SecondaryCta reduced={reduced} />
          </div>
        </section>

        <hr className="sg-landing-rule" aria-hidden />

        <div id={LANDING_SECTIONS.how} className="sg-landing-how">
          <section
            id={LANDING_SECTIONS.connects}
            className="sg-landing-sheet"
            aria-labelledby="sg-connects-title"
          >
            <h2 id="sg-connects-title" className="sg-eyebrow sg-landing-eyebrow">
              Connects to
            </h2>
            <div className="sg-landing-sheet-body">
              <dl className="sg-landing-list">
                {LANDING_INTEGRATIONS.map((item) => (
                  <div className="sg-landing-row" key={item.id}>
                    <dt>{item.name}</dt>
                    <dd>{item.detail}</dd>
                  </div>
                ))}
              </dl>
              <div className="sg-landing-notes">
                <p>{LANDING_CONNECTS_LEAD}</p>
                <p>{LANDING_ONTOLOGY_NOTE}</p>
              </div>
            </div>
          </section>

          <section
            id={LANDING_SECTIONS.shows}
            className="sg-landing-sheet"
            aria-labelledby="sg-shows-title"
          >
            <h2 id="sg-shows-title" className="sg-eyebrow sg-landing-eyebrow">
              Shows you
            </h2>
            <ul className="sg-landing-promises">
              {LANDING_PROMISES.map((item) => (
                <li key={item.id}>
                  <h3>{item.title}</h3>
                  <p>{item.note}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      <footer className="sg-landing-foot">
        <span className="sg-eyebrow sg-landing-eyebrow">{LANDING_FOOTER}</span>
      </footer>
    </div>
  );
}
