import Link from "next/link";
import { AuthControls } from "@/components/auth/AuthControls";

export default function LandingPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-toy-sky text-toy-ink">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-[radial-gradient(120%_80%_at_50%_100%,#9fd3e0_0%,#9fd3e0_46%,transparent_47%)]" />
      <IslandMark />

      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <p className="font-toy text-[13px] font-extrabold uppercase tracking-[0.18em] text-[#6b5f78]">
          StudyGotchi
        </p>
        <AuthControls variant="landing" />
      </header>

      <div className="relative mx-auto flex min-h-[calc(100dvh-80px)] max-w-3xl flex-col items-center px-6 pb-16 pt-8 text-center sm:pt-16">
        <h1 className="font-toy text-[44px] font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-[56px]">
          Your course,
          <br />
          as an island.
        </h1>
        <p className="mt-5 max-w-md font-toy text-[17px] font-medium leading-relaxed text-[#6b5f78]">
          Places are topics. Little residents appear when your own work meets what the course already taught.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/world"
            className="rounded-full border-[3px] border-toy-ink bg-toy-cream px-6 py-3 font-toy text-[16px] font-extrabold text-toy-ink shadow-[0_3px_0_#3a2f45] transition-transform hover:-translate-y-0.5"
          >
            Enter your world
          </Link>
          <Link
            href="/knowledge"
            className="rounded-full px-5 py-3 font-toy text-[15px] font-bold text-[#6b5f78] underline-offset-4 hover:underline"
          >
            Open the graph
          </Link>
        </div>

        <p className="mt-auto pt-16 font-toy text-[13px] font-semibold text-[#6b5f78]">
          Drop a problem set. Watch a place grow.
        </p>
      </div>
    </main>
  );
}

function IslandMark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 640 220"
      className="pointer-events-none absolute bottom-[18%] left-1/2 h-[220px] w-[min(640px,92vw)] -translate-x-1/2"
    >
      <ellipse cx="320" cy="168" rx="210" ry="22" fill="#5a3f6b" opacity="0.12" />
      <path
        d="M120 150 C160 90 210 70 280 78 C310 40 360 36 400 70 C460 58 520 90 540 150 C400 168 220 168 120 150Z"
        fill="#8fc48a"
      />
      <path d="M210 108 C230 88 270 86 290 108" fill="#b4dab0" />
      <path d="M360 96 C380 70 430 72 448 104" fill="#bfe0a0" />
      <path d="M300 86 C318 58 350 58 362 88" fill="#e6f2fb" />
      <circle cx="248" cy="118" r="16" fill="#f2a86f" />
      <circle cx="242" cy="114" r="2.2" fill="#2b2b33" />
      <circle cx="254" cy="114" r="2.2" fill="#2b2b33" />
      <rect x="430" y="112" width="18" height="22" rx="4" fill="#4f8a4a" />
      <circle cx="488" cy="128" r="7" fill="#c9a2e6" />
    </svg>
  );
}
