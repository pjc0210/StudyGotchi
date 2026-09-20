import { Link, NavLink } from 'react-router-dom'

export function SiteHeader() {
  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Main">
        <NavLink to="/" end className="site-wordmark">
          StudyGotchi
        </NavLink>
        <NavLink to="/earth">Earth</NavLink>
      </nav>
      <Link className="login-btn" to="/login">
        Login
      </Link>
    </header>
  )
}
