"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { emit } from "@/lib/audio/events";
import { AccountMenu } from "./AccountMenu";
import { useShellNav } from "./shell-nav";

const ITEMS: { href: string; label: string; match: RegExp }[] = [
  { href: "/earth", label: "Planet", match: /^\/(earth|world|w)(\/|$)/ },
  { href: "/knowledge", label: "Galaxy", match: /^\/knowledge(\/|$)/ },
];

/**
 * The one header. Wordmark left, World | Space centre, account right. Inside
 * the product shell the two tabs hand off through the shell's exit beat so the
 * sky holds while the planet leaves and the constellation arrives.
 */
export function ProductHeader({ variant = "floating" }: { variant?: "floating" | "static" }) {
  const pathname = usePathname();
  const nav = useShellNav();

  return (
    <header className={`sg-header${variant === "static" ? " is-static" : ""}`}>
      <div className="sg-header-lead">
        <Link href="/" className="sg-wordmark" aria-label="StudyGotchi home">
          StudyGotchi
        </Link>
      </div>

      <nav className="sg-nav" aria-label="Product">
        {ITEMS.map((item) => {
          const active = item.match.test(pathname ?? "");
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

      <div className="sg-header-trail">
        <AccountMenu />
      </div>
    </header>
  );
}
