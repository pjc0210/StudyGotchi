"use client";

import Link from "next/link";
import { useLayoutEffect, useState, ViewTransition } from "react";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { ProductHeader } from "@/components/shell/ProductHeader";
import { useReducedMotion } from "@/components/shell/useSpaceAttribute";
import { EarthGlobe } from "@/components/site/EarthGlobe";
import { SITE_GATED } from "@/lib/config";
import {
  LANDING_BODY,
  LANDING_HEADLINE,
  LANDING_PROVENANCE,
  LANDING_STATES,
  LANDING_WINDOW_STATS,
  landingCourseStamp,
  landingCta,
  landingStateMark,
} from "@/lib/landing-copy";
import { DEMO_COURSES } from "@/lib/world/demo-courses";

/* The window is cut open once per session; a reload after that just shows the planet. */
function useOnce(key: string) {
  const [first, setFirst] = useState(false);
  useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage unavailable; the cut plays again */
    }
    setFirst(true);
  }, [key]);
  return first;
}

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

export function Landing() {
  const cut = useOnce("sg-landing-cut");
  const reduced = useReducedMotion();
  const stamp = landingCourseStamp(DEMO_COURSES[0]);

  return (
    <div className="sg-landing">
      <ProductHeader variant="landing" />
      <section className="sg-hero" aria-labelledby="sg-hero-title">
        <div className="sg-hero-copy">
          <span className="sg-eyebrow">{stamp}</span>
          <h1 id="sg-hero-title" className="sg-display">
            {LANDING_HEADLINE}
          </h1>
          <p className="sg-body">{LANDING_BODY}</p>
        </div>

        <div className="sg-window-col">
          <div className="sg-window" aria-label="The planet, one town per course">
            <div className="sg-window-stage" data-cut={cut && !reduced ? "true" : undefined}>
              <ViewTransition name="studygotchi-earth" share="earth-morph" default="none">
                <div className="sg-window-fallback">
                  <EarthGlobe decorative />
                </div>
              </ViewTransition>
            </div>
            <span className="sg-window-caption">
              {LANDING_WINDOW_STATS.map((stat) => (
                <span className="sg-window-stat" key={stat.label}>
                  <span className="sg-window-stat-label">{stat.label}</span>
                  <span className="sg-window-stat-value">{stat.value}</span>
                </span>
              ))}
            </span>
          </div>

          <aside className="provenance-bubble sg-landing-bubble" aria-label={`${LANDING_PROVENANCE.speaker} on ${LANDING_PROVENANCE.code}`}>
            <span className="provenance-tab">{LANDING_PROVENANCE.tab}</span>
            <span className="sg-eyebrow">{LANDING_PROVENANCE.code}</span>
            <h2>{LANDING_PROVENANCE.speaker}</h2>
            <p>{LANDING_PROVENANCE.line}</p>
            <span className="provenance-source">{LANDING_PROVENANCE.source}</span>
          </aside>
        </div>

        <div className="sg-hero-foot">
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
          </div>
          <ul className="sg-ladder" aria-label="The three states an idea can be in">
            {LANDING_STATES.map((step) => (
              <li key={step.id}>
                <span className="sg-landing-mark" data-mark={step.mark}>
                  {step.mark === "lamp" ? <span className="sg-landing-mark-lamp" aria-hidden /> : null}
                  {landingStateMark(step)}
                </span>
                <p className="sg-ladder-note">{step.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
