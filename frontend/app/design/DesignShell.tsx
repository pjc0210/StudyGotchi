'use client'

import { useState } from 'react'
import type { GoldenView } from '@/components/world/golden/golden-spec'
import { DirectionA } from './DirectionA'
import type { ChromeScreen } from './chrome-spec'

/** Holds the world state the prototype's gallery shell owned: progress and camera view. */
export function DesignShell({ screen }: { screen: ChromeScreen }) {
  const [progress, setProgress] = useState(0.5)
  const [view, setView] = useState<GoldenView>('overview')
  return (
    <DirectionA screen={screen} progress={progress} setProgress={setProgress} view={view} setView={setView} />
  )
}
