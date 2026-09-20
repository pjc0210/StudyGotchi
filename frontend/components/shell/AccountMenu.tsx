"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { SignedIn, SignedOut, SignOutButton, useUser } from "@clerk/nextjs";
import { WorldAppearanceSettings } from "@/components/theme/WorldAppearanceSettings";
import { emit } from "@/lib/audio/events";
import { DEV_STUDENT_ID, SITE_GATED, USE_MOCK } from "@/lib/config";

function Menu({
  name,
  detail,
  children,
}: {
  name: string;
  detail?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  // A <details> stays open on its own; close it like a menu should.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onPointer = (e: PointerEvent) => {
      if (el.open && !el.contains(e.target as Node)) el.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && el.open) el.open = false;
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const initial = (name.trim()[0] ?? "?").toUpperCase();

  return (
    <details ref={ref} className="sg-account" onToggle={(e) => emit({ type: "ui", kind: e.currentTarget.open ? "tap" : "hover" })}>
      <summary aria-label="Account and settings">
        <span className="sg-avatar" aria-hidden>
          {initial}
        </span>
        <span className="sg-account-name">{name}</span>
      </summary>
      <div className="sg-menu sg-sheet" role="menu" aria-label="Account">
        <div className="sg-menu-who">
          <strong>{name}</strong>
          {detail ? <span className="sg-muted">{detail}</span> : null}
        </div>
        <WorldAppearanceSettings />
        {children}
      </div>
    </details>
  );
}

function SignedInMenu() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name = user?.fullName ?? user?.username ?? email ?? "Account";
  return (
    <Menu name={name || "Account"} detail={email && email !== name ? email : undefined}>
      <SignOutButton redirectUrl="/">
        <button type="button" className="sg-btn" style={{ width: "100%" }}>
          Log out
        </button>
      </SignOutButton>
    </Menu>
  );
}

/** One control, top right, on every screen: who you are, how the sky looks, and the way out. */
export function AccountMenu() {
  if (!SITE_GATED) {
    return (
      <Menu
        name={USE_MOCK ? "Mock student" : "Sandbox student"}
        detail={USE_MOCK ? "Fixture data, no account" : `Dev identity ${DEV_STUDENT_ID.slice(0, 8)}`}
      />
    );
  }
  return (
    <>
      <SignedIn>
        <SignedInMenu />
      </SignedIn>
      <SignedOut>
        <Link className="sg-btn" href="/login">
          Log in
        </Link>
      </SignedOut>
    </>
  );
}
