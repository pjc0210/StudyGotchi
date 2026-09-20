"use client";

import Link from "next/link";
import { ViewTransition } from "react";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { GeneratedPixelSpiral } from "@/components/shell/GeneratedPixelSpiral";
import { SITE_GATED } from "@/lib/config";
import { planetHref } from "@/lib/world/earth-nav";
import { LandingEarth } from "./LandingEarth";
import "./landing.css";

const TABS = [
  { href: planetHref(), label: "Knowledge" },
  { href: "/knowledge", label: "Information" },
] as const;

const CONTINUE = (
  <Link className="sg-btn sg-btn-primary sg-btn-lg" href={planetHref()} transitionTypes={["enter-world"]}>
    Continue
  </Link>
);

export function Landing() {
  const action = SITE_GATED ? (
    <>
      <SignedOut>
        <Link className="sg-btn sg-btn-primary sg-btn-lg" href="/login">
          Login
        </Link>
      </SignedOut>
      <SignedIn>{CONTINUE}</SignedIn>
    </>
  ) : (
    CONTINUE
  );

  return (
    <div className="sg-landing">
      <div className="sg-landing-art" aria-hidden>
        <span className="sg-landing-wash" />
        <GeneratedPixelSpiral className="sg-landing-galaxy" size={72} opacity={0.32} spin />
        <ViewTransition name="studygotchi-earth" share="earth-morph" default="none">
          <div className="sg-landing-planet">
            <LandingEarth />
            <span className="sg-landing-shadow" />
          </div>
        </ViewTransition>
      </div>

      <header className="sg-landing-bar">
        <span className="sg-landing-word">StudyGotchi</span>
        <nav className="sg-landing-tabs" aria-label="Product">
          {TABS.map((tab) => (
            <Link key={tab.href} href={tab.href} className="sg-landing-tab">
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="sg-landing-fore">
        <p className="sg-landing-line">
          Continue where{" "}
          <br />
          you left off.
        </p>
        <p className="sg-landing-note">Your towns are still turning.</p>
        {action}
      </main>
    </div>
  );
}
