/** Pastel globe used on the main and earth pages. No gradients. */
export function EarthGlobe() {
  return (
    <div className="earth-globe" aria-hidden="true">
      <svg viewBox="0 0 1000 1000" width="1000" height="1000">
        <circle cx="500" cy="500" r="500" fill="#b7d3ea" />
        {/* North America */}
        <path
          fill="#c9ddb4"
          d="M210 280c40-70 130-90 190-70 40 14 70 50 62 96-10 54-8 88 28 112 22 16 18 48-8 58-48 18-96-10-138-8-52 2-88-38-110-78-18-34-42-70-24-110z"
        />
        {/* South America */}
        <path
          fill="#d5e6c0"
          d="M340 520c28-8 52 18 58 46 8 38 22 72 8 108-12 30-48 48-74 34-30-16-40-58-36-92 4-32 16-68 44-96z"
        />
        {/* Europe / Africa */}
        <path
          fill="#cfe0b8"
          d="M500 290c36-18 78-8 92 24 10 24-6 48 8 70 18 28 22 64 8 94-16 34-58 52-90 38-36-16-48-62-40-100 6-28 4-62 22-126z"
        />
        <path
          fill="#d7e8c6"
          d="M520 500c32 6 58 40 54 74-4 42-18 86-54 104-28 14-58-6-62-36-6-40 10-86 28-118 10-18 20-28 34-24z"
        />
        {/* Asia / Australia */}
        <path
          fill="#c5d9ae"
          d="M620 250c70-24 150 6 176 70 18 44 8 90-22 122-26 28-70 22-98-2-40-34-70-28-88-70-16-38 0-92 32-120z"
        />
        <path
          fill="#d2e4bc"
          d="M760 560c28-6 54 16 58 42 4 28-18 50-44 52-28 2-54-22-52-48 2-24 16-40 38-46z"
        />
        {/* Ice caps */}
        <ellipse cx="500" cy="70" rx="210" ry="70" fill="#e8f1f6" />
        <ellipse cx="500" cy="930" rx="180" ry="58" fill="#e8f1f6" />
      </svg>
    </div>
  )
}
