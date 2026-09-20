'use client'

import { useLayoutEffect, useState, type ReactNode } from 'react'

function sizeFromWindow() {
  return (window.innerWidth * 4) / 7
}

/** Square globe: width and height are 4/7 of the window width. Scales on resize. */
export function EarthGlobe({
  variant = 'corner',
  children,
}: {
  variant?: 'corner' | 'friends'
  children?: ReactNode
}) {
  const [size, setSize] = useState(0)

  useLayoutEffect(() => {
    const apply = () => {
      const next =
        variant === 'friends' ? sizeFromWindow() * 1.3 : sizeFromWindow()
      setSize(next)
      document.documentElement.style.setProperty('--globe-size', `${next}px`)
    }
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [variant])

  const shift = size / 4
  const style =
    variant === 'friends'
      ? {
          width: size,
          height: size,
          left: '50%',
          right: 'auto',
          bottom: -size / 2,
          transform: 'translateX(-50%)',
          pointerEvents: 'none' as const,
        }
      : size
        ? {
            width: size,
            height: size,
            right: -shift,
            bottom: -shift,
          }
        : undefined

  return (
    <div className={`earth-globe${variant === 'friends' ? ' is-friends' : ''}`} style={style}>
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <circle cx="500" cy="500" r="500" fill="var(--ocean)" />
        <path
          fill="var(--land)"
          d="M190 300c48-82 148-108 218-78 46 20 78 58 68 108-12 58-4 96 36 122 26 18 16 52-12 62-52 20-108-12-154-8-56 4-96-40-120-84-20-36-52-76-36-122z"
        />
        <path
          fill="var(--land)"
          d="M328 528c30-10 56 16 62 48 8 40 24 76 6 114-14 32-52 50-80 34-32-18-42-62-36-98 6-34 18-72 48-98z"
        />
        <path
          fill="var(--land-2)"
          d="M492 278c40-20 86-6 100 28 12 26-8 52 8 74 20 30 24 68 8 98-18 36-64 54-96 38-38-18-50-66-40-104 8-30 4-66 20-134z"
        />
        <path
          fill="var(--land)"
          d="M512 498c34 8 62 42 56 78-6 44-20 88-58 106-30 14-60-8-64-38-6-42 12-88 32-122 10-18 22-28 34-24z"
        />
        <path
          fill="var(--land-2)"
          d="M612 242c76-28 158 4 186 72 20 46 6 94-26 126-28 28-74 20-102-6-42-36-74-28-92-72-16-40 2-94 34-120z"
        />
        <path
          fill="var(--land)"
          d="M752 554c30-8 58 14 62 42 4 30-20 52-48 54-30 2-56-24-54-50 2-26 18-40 40-46z"
        />
        <ellipse cx="500" cy="68" rx="216" ry="72" fill="var(--ice)" />
        <ellipse cx="500" cy="932" rx="186" ry="60" fill="var(--ice)" />
      </svg>
      {children}
    </div>
  )
}
