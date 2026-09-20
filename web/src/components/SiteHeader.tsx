import { Link, NavLink } from 'react-router-dom'
import { useStore } from '../store'

export function SiteHeader() {
  const { user } = useStore()

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Main">
        <NavLink to="/" end className="site-wordmark">
          StudyGotchi
        </NavLink>
        <NavLink to="/earth">Earth</NavLink>
      </nav>
      {user ? (
        <Link className="login-btn" to="/earth">
          {user.handle}
        </Link>
      ) : (
        <Link className="login-btn" to="/login">
          Login
        </Link>
      )}
    </header>
  )
}
