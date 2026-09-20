"use client";

import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export function AuthControls({ variant = "app" }: { variant?: "app" | "landing" }) {
  const ghost =
    variant === "landing"
      ? "rounded-full px-4 py-2 font-toy text-[14px] font-extrabold text-[#6b5f78] hover:text-toy-ink"
      : "rounded-md px-2.5 py-1.5 text-[13px] font-medium text-ink-dim hover:bg-raised hover:text-ink";
  const solid =
    variant === "landing"
      ? "rounded-full border-[3px] border-toy-ink bg-toy-cream px-4 py-2 font-toy text-[14px] font-extrabold text-toy-ink shadow-[0_3px_0_#3a2f45]"
      : "rounded-md bg-ink px-2.5 py-1.5 text-[13px] font-medium text-canvas hover:opacity-90";

  return (
    <div className="flex items-center gap-2">
      <SignedOut>
        <SignInButton>
          <button type="button" className={ghost}>
            Sign in
          </button>
        </SignInButton>
        <SignUpButton>
          <button type="button" className={solid}>
            Sign up
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </div>
  );
}
