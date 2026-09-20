import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { EarthGlobe } from "@/components/site/EarthGlobe";
import { SiteHeader } from "@/components/site/SiteHeader";

export default function LandingPage() {
  return (
    <div className="earth-page is-main">
      <SiteHeader />
      <section className="hero-copy">
        <h1>StudyGotchi</h1>
        <p>A living knowledge world for the courses you study.</p>
        <SignedOut>
          <Link className="start-btn" href="/login">
            Start
          </Link>
        </SignedOut>
        <SignedIn>
          <Link className="start-btn" href="/earth">
            Enter your world
          </Link>
        </SignedIn>
      </section>
      <EarthGlobe decorative />
    </div>
  );
}
