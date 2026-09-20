'use client'

import { EarthGlobe } from '@/components/EarthGlobe'
import { PeerChrome } from '@/components/PeerChrome'
import { SiteHeader } from '@/components/SiteHeader'
import type { PublicAccount } from '@/lib/db/users'
import { useStore } from '@/lib/store'

export function EarthView({ peer }: { peer?: PublicAccount }) {
  const { courses } = useStore()
  const overlayCourses = peer?.courses ?? courses

  return (
    <div className="earth-page is-earth">
      <SiteHeader />
      <aside className="course-overlay">
        {peer ? (
          <PeerChrome account={peer} view="earth" />
        ) : (
          <h1>Your courses</h1>
        )}
        <p>
          {peer
            ? 'Courses they submitted materials for.'
            : 'Courses you submitted materials for.'}
        </p>
        <ul className="course-list">
          {overlayCourses.map((course) => (
            <li key={course.code}>
              <span className="course-code">{course.code}</span>
              <span className="course-name">{course.name}</span>
            </li>
          ))}
        </ul>
      </aside>
      <EarthGlobe />
    </div>
  )
}
