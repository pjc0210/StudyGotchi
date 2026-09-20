/** Desk-globe with raised lands, ice town, and a live ocean — DS-soft, not a flat disc. */

export function LandingEarth() {
  return (
    <svg className="sg-landing-earth" viewBox="0 0 220 220" aria-hidden>
      <defs>
        <radialGradient id="le-sea" cx="32%" cy="28%" r="74%">
          <stop offset="0%" stopColor="#9fd0e2" />
          <stop offset="28%" stopColor="#6aa8c4" />
          <stop offset="62%" stopColor="#3e7a96" />
          <stop offset="100%" stopColor="#1e3d50" />
        </radialGradient>
        <radialGradient id="le-atmo" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="#9ec4d6" stopOpacity="0" />
          <stop offset="86%" stopColor="#9ec4d6" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#d7e8f0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="le-term" x1="14%" y1="8%" x2="94%" y2="92%">
          <stop offset="0%" stopColor="#fff4c8" stopOpacity="0.2" />
          <stop offset="38%" stopColor="#2a3344" stopOpacity="0" />
          <stop offset="100%" stopColor="#0e141c" stopOpacity="0.58" />
        </linearGradient>
        <radialGradient id="le-spec" cx="30%" cy="26%" r="26%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <clipPath id="le-clip">
          <circle cx="110" cy="110" r="86" />
        </clipPath>
      </defs>

      <circle cx="110" cy="110" r="102" fill="url(#le-atmo)" />
      <circle cx="110" cy="110" r="86" fill="url(#le-sea)" />

      <g clipPath="url(#le-clip)">
        <g className="sg-landing-waves" fill="none" stroke="#d7eef6" strokeOpacity="0.22" strokeWidth="1.15">
          <path d="M18 128c18 6 28-8 46-4 16 4 22 14 40 10 16-4 24-16 42-12 14 3 22 12 38 8" />
          <path d="M22 148c20 5 30-10 50-5 18 4 24 12 42 8 16-4 26-14 44-10" />
          <path d="M28 168c22 4 32-8 52-3 18 4 26 10 40 6" />
        </g>

        <g>
          <path fill="#6d8f58" d="M34 84h18v8H34zm14 4h28v8H48zm-8 8h40v8H40zm6 8h26v7H46zm-10 6h22v6H36z" />
          <path fill="#8fb56f" d="M40 82h22v6H40zm16 6h24v7H56zm-10 7h32v6H46z" />
          <path fill="#c5d98a" d="M54 80h10v4H54zm22 6h8v3H76z" />
        </g>

        <g>
          <path fill="#5f8a52" d="M124 66h20v7h-20zm12 5h28v8h-28zm-8 8h40v8h-40zm10 8h22v6h-22z" />
          <path fill="#8fbf6a" d="M128 64h16v6h-16zm10 6h24v7h-24zm-6 7h30v6h-30z" />
          <path fill="#d4c07a" d="M152 70h9v5h-9z" />
        </g>

        <g>
          <path fill="#4f7a63" d="M76 126h16v7H76zm10 5h26v8H86zm-4 8h22v6H82z" />
          <path fill="#7aaa7a" d="M80 124h18v6H80zm10 6h18v5H90z" />
        </g>

        <g>
          <path fill="#c9a06a" d="M154 118h28v8h-28zm4 8h22v7h-22z" />
          <path fill="#e0c48a" d="M158 116h20v6h-20z" />
        </g>

        <g>
          <path fill="#e8f2f6" d="M74 28h62v10H74zm8 10h50v8H82zm4 8h42v6H86z" />
          <path fill="#f7fbfc" d="M86 26h40v8H86zm10 8h24v6H96z" />
          <rect x="104" y="36" width="5" height="8" fill="#dce6ee" />
          <rect x="111" y="34" width="4" height="10" fill="#c5d4e0" />
          <rect x="98" y="38" width="4" height="6" fill="#b7c8d6" />
          <rect x="117" y="38" width="3" height="5" fill="#e8c56a" />
        </g>

        <ellipse cx="110" cy="188" rx="38" ry="12" fill="#e8f0f4" opacity="0.72" />

        <g fill="#efe6d3">
          <path d="M48 154h10v3H48zM160 142h12v3h-12z" />
          <path d="M52 152h3v5h-3zM166 140h3v5h-3z" />
        </g>

        <circle cx="110" cy="110" r="86" fill="url(#le-term)" />
        <circle cx="110" cy="110" r="86" fill="url(#le-spec)" />
      </g>

      <circle cx="110" cy="110" r="86.7" fill="none" stroke="#2a3344" strokeOpacity="0.1" strokeWidth="1.1" />
    </svg>
  );
}
