"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, SignOutButton, useUser } from "@clerk/nextjs";

export function SiteHeader() {
  const pathname = usePathname();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.username ?? "";

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Main">
        <Link href="/" className={`site-wordmark${pathname === "/" ? " active" : ""}`}>
          StudyGotchi
        </Link>
        <Link href="/earth" className={pathname.startsWith("/earth") ? "active" : undefined}>
          Earth
        </Link>
        <Link href="/knowledge" className={pathname.startsWith("/knowledge") ? "active" : undefined}>
          Graph
        </Link>
      </nav>
      <div className="site-account">
        <SignedIn>
          <span className="account-email">{email}</span>
          <SignOutButton redirectUrl="/">
            <button type="button" className="login-btn ghost">
              Log out
            </button>
          </SignOutButton>
        </SignedIn>
        <SignedOut>
          <Link className="login-btn" href="/login">
            Login
          </Link>
        </SignedOut>
      </div>
    </header>
  );
}
