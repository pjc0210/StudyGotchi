import { Link } from 'react-router-dom'
import { EarthGlobe } from '../components/EarthGlobe'
import { SiteHeader } from '../components/SiteHeader'

export function MainPage() {
  return (
    <div className="earth-page is-main">
      <SiteHeader />
      <section className="hero-copy">
        <h1>StudyGotchi</h1>
        <p>A living knowledge world for the courses you study.</p>
        <Link className="start-btn" to="/login">
          Start
        </Link>
      </section>
      <EarthGlobe />
    </div>
  )
}
