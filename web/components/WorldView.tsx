'use client'

import { SiteHeader } from '@/components/SiteHeader'

/**
 * Placeholder only. The world/terrain frontend has not been imported into
 * this dashboard yet - it lives in a separate, not-yet-merged effort. This
 * intentionally renders no graph, no mock data, and no borrowed Earth/Graph
 * visuals, so it cannot be mistaken for real content.
 */
export function WorldView() {
  return (
    <div className="earth-page is-world">
      <SiteHeader />
      <section className="hero-copy">
        <h1>World</h1>
        <p>Not imported yet. This tab is a placeholder for the terrain/world frontend.</p>
      </section>
    </div>
  )
}
