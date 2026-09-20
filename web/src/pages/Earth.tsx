import { EarthGlobe } from '../components/EarthGlobe'
import { SiteHeader } from '../components/SiteHeader'
import { useStore } from '../store'

export function EarthPage() {
  const { courses } = useStore()

  return (
    <div className="earth-page">
      <SiteHeader />
      <div className="earth-stage">
        <aside className="course-panel">
          <h1>Your courses</h1>
          <p>Materials you submitted live on this earth.</p>
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
    </div>
  )
}
