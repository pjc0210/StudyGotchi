"use client";

import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export function AuthControls() {
  return (
    <div className="flex items-center gap-2">
      <SignedOut>
        <Link
          href="/login"
          className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-ink-dim hover:bg-raised hover:text-ink"
        >
          Sign in
        </Link>
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </div>
  );
}
