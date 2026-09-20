'use client'

import { EarthGlobe } from '@/components/EarthGlobe'
import { SiteHeader } from '@/components/SiteHeader'
import { useStore } from '@/lib/store'

export function EarthView() {
  const { courses } = useStore()

  return (
    <div className="earth-page is-earth">
      <SiteHeader />
      <aside className="course-overlay">
        <h1>Your courses</h1>
        <p>Courses you submitted materials for.</p>
        <ul className="course-list">
          {courses.map((course) => (
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
