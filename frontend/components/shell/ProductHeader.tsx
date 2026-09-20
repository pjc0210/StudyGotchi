"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { emit } from "@/lib/audio/events";
import { landingHeaderNav } from "@/lib/landing-copy";
import { PRODUCT_NAV } from "@/lib/world/earth-nav";
import { AccountMenu } from "./AccountMenu";
import { useShellNav } from "./shell-nav";

/**
 * The one header. Wordmark left, Courses | Information centre, account right.
 * Routes stay /earth and /knowledge; the tabs hand off through the shell's exit beat.
 * Landing keeps the wordmark and account only — no product tabs on `/`.
 */
export function ProductHeader({
  variant = "floating",
}: {
  variant?: "floating" | "static" | "landing";
}) {
  const pathname = usePathname();
  const nav = useShellNav();
  const landing = variant === "landing";
  const items = landing ? landingHeaderNav() : PRODUCT_NAV;

  return (
    <header
      className={`sg-header${variant === "static" || landing ? " is-static" : ""}${landing ? " is-landing" : ""}`}
    >
      <div className="sg-header-lead">
        <Link href="/" className="sg-wordmark" aria-label="StudyGotchi home">
          StudyGotchi
        </Link>
      </div>

      {items.length > 0 ? (
        <nav className="sg-nav" aria-label="Product">
          {items.map((item) => {
            const active = "match" in item && item.match.test(pathname ?? "");
            return (
              <Link
                key={item.href}
                href={item.href}
                className="sg-nav-item"
                aria-current={active ? "page" : undefined}
                onPointerEnter={() => emit({ type: "ui", kind: "hover" })}
                onClick={(e) => {
                  if (active) {
                    e.preventDefault();
                    return;
                  }
                  emit({ type: "ui", kind: "tap" });
                  if (nav.available) {
                    e.preventDefault();
                    nav.go(item.href);
                  }
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}

      <div className="sg-header-trail">
        <AccountMenu />
      </div>
    </header>
  );
}
