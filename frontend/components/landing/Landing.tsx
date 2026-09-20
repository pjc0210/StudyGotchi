"use client";

import Link from "next/link";
import { useLayoutEffect, useState, ViewTransition } from "react";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { ProductHeader } from "@/components/shell/ProductHeader";
import { useReducedMotion } from "@/components/shell/useSpaceAttribute";
import { EarthGlobe } from "@/components/site/EarthGlobe";
import { SITE_GATED } from "@/lib/config";

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

const LADDER = [
  { label: "Touched", fill: "var(--a-touched)", note: "A lecture opened. A sprout." },
  { label: "Demonstrated", fill: "var(--a-demonstrated)", note: "A problem solved. A landmark." },
  { label: "Mastered", fill: "var(--a-mastered)", note: "Confirmed. The light stays on." },
];

export function Landing() {
  const cut = useOnce("sg-landing-cut");
  const reduced = useReducedMotion();

  const enter = (
    <Link className="sg-btn sg-btn-primary sg-btn-lg" href="/earth" transitionTypes={["enter-world"]}>
      Enter your world
    </Link>
  );

  return (
    <div className="sg-landing">
      <ProductHeader variant="static" />
      <section className="sg-hero" aria-labelledby="sg-hero-title">
        <div className="sg-hero-copy">
          <span className="sg-eyebrow">One world per course</span>
          <h1 id="sg-hero-title" className="sg-display">
            Turn in a problem set. Someone moves in.
          </h1>
          <p className="sg-body">
            Drop in the notes and problem sets you already have. Each course becomes a small world you can
            walk around: an idea you have touched sprouts, one you have worked becomes a landmark, and every
            resident can name the page it came from. Nothing grows from work you did not do.
          </p>
          <div className="sg-hero-actions">
            {SITE_GATED ? (
              <>
                <SignedOut>
                  <Link className="sg-btn sg-btn-primary sg-btn-lg" href="/login">
                    Start your world
                  </Link>
                </SignedOut>
                <SignedIn>{enter}</SignedIn>
              </>
            ) : (
              enter
            )}
            <Link className="sg-btn sg-btn-text" href="/knowledge">
              Look at the sky
            </Link>
          </div>
          <ul className="sg-ladder" aria-label="The three states an idea can be in">
            {LADDER.map((step) => (
              <li key={step.label}>
                <span
                  className="sg-chip"
                  style={{ ["--fill" as string]: step.fill, ["--fill-ring" as string]: "none" }}
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
          <p className="sg-ladder-note">
            {LADDER.map((s) => s.note).join(" ")}
          </p>
        </div>

        <div className="sg-window" aria-label="The planet, one town per course">
          <div className="sg-window-stage" data-cut={cut && !reduced ? "true" : undefined}>
            <ViewTransition name="studygotchi-earth" share="earth-morph" default="none">
              <div className="sg-window-fallback">
                <EarthGlobe decorative />
              </div>
            </ViewTransition>
          </div>
          <span className="sg-window-caption">
            <span className="sg-live-dot" aria-hidden />
            <span className="sg-eyebrow" style={{ color: "var(--a-ink)" }}>
              Seven courses, one planet
            </span>
          </span>
        </div>
      </section>
    </div>
  );
}
