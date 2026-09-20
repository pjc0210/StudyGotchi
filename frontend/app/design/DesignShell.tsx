'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { GoldenView } from '@/components/world/golden/golden-spec'
import { DirectionA } from './DirectionA'
import type { ChromeScreen } from './chrome-spec'
import type { CopyTreatment, DesignTheme, TypeTreatment } from './page'

/** Holds the world state the prototype's gallery shell owned: progress and camera view. */
export function DesignShell({
  screen,
  theme,
  type,
  copy,
}: {
  screen: ChromeScreen
  theme: DesignTheme
  type: TypeTreatment
  copy: CopyTreatment
}) {
  const [progress, setProgress] = useState(0.5)
  const [view, setView] = useState<GoldenView>('overview')

  const href = (next: {
    screen?: ChromeScreen
    theme?: DesignTheme
    type?: TypeTreatment
    copy?: CopyTreatment
  }) => {
    const values = { screen, theme, type, copy, ...next }
    return `/design?${new URLSearchParams(values).toString()}`
  }

  return (
    <div className="design-stage" data-theme={theme} data-type={type}>
      <nav className="design-compare" aria-label="Design comparison controls">
        <div className="design-compare-group">
          <span>Theme</span>
          {(['graphite', 'biome', 'night'] as const).map((value) => (
            <Link key={value} href={href({ theme: value })} aria-current={theme === value ? 'page' : undefined}>
              {value}
            </Link>
          ))}
        </div>
        <div className="design-compare-group">
          <span>Type</span>
          {(['rounded', 'humanist', 'editorial'] as const).map((value) => (
            <Link key={value} href={href({ type: value })} aria-current={type === value ? 'page' : undefined}>
              {value}
            </Link>
          ))}
        </div>
        <div className="design-compare-group">
          <span>Copy</span>
          {(['direct', 'world', 'diagnostic'] as const).map((value) => (
            <Link key={value} href={href({ copy: value })} aria-current={copy === value ? 'page' : undefined}>
              {value}
            </Link>
          ))}
        </div>
      </nav>
      <DirectionA
        screen={screen}
        progress={progress}
        setProgress={setProgress}
        view={view}
        setView={setView}
        theme={theme}
        copy={copy}
      />
    </div>
  )
}
