export function Creature({ tint = '#8fd4b0' }: { tint?: string }) {
  return (
    <svg className="creature" width="120" height="120" viewBox="0 0 64 64" aria-hidden>
      <ellipse cx="32" cy="56" rx="16" ry="4" fill="rgba(0,0,0,0.25)" />
      <path d="M18 36c0-14 8-24 14-24s14 10 14 24-6 18-14 18-14-4-14-18z" fill={tint} />
      <circle cx="26" cy="30" r="3" fill="#16342c" />
      <circle cx="38" cy="30" r="3" fill="#16342c" />
      <circle cx="26.8" cy="29.2" r="1" fill="#fff" />
      <circle cx="38.8" cy="29.2" r="1" fill="#fff" />
      <path d="M26 40c3 4 9 4 12 0" stroke="#16342c" strokeWidth="1.6" fill="none" />
      <circle cx="46" cy="18" r="5" fill="#e4a44a" />
      <rect x="29" y="12" width="6" height="6" rx="1" fill="#16342c" opacity="0.2" />
    </svg>
  )
}

export function WorldStage({
  mood,
  tint,
  name,
}: {
  mood: string
  tint?: string
  name: string
}) {
  return (
    <div className="world" style={{ background: `linear-gradient(#122821, ${tint ?? '#1f4a3c'} 42%, #3d6b4f 42%, #2a4a38 78%)` }}>
      <div className="stars" />
      <div className="speech pixel">{name}: {mood}</div>
      <Creature tint={tint ? '#c9e8c4' : '#8fd4b0'} />
    </div>
  )
}
