import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useStore } from '../store'

const links = [
  ['/', 'Home'],
  ['/graph', 'Graph'],
  ['/world', 'World'],
  ['/friends', 'Friends'],
  ['/classrooms', 'Classrooms'],
  ['/upload', 'Upload'],
  ['/settings', 'Account'],
] as const

export function Layout() {
  const { user, logout, notices, toasts, markNoticesRead } = useStore()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const unread = notices.some((n) => n.unread)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <div className="brand-mark">
            <svg width="22" height="22" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="8" fill="#8fd4b0" />
              <circle cx="24" cy="8" r="3" fill="#e4a44a" />
            </svg>
          </div>
          <div>
            <h1>StudyGotchi</h1>
            <p>living knowledge</p>
          </div>
        </NavLink>
        <nav className="nav">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', fontSize: 13 }}>
          <div className="muted">{user?.handle}</div>
          <button
            className="btn ghost small"
            style={{ marginTop: 8 }}
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div />
          <div className="bell-wrap">
            <button
              className="bell"
              aria-label="Notifications"
              onClick={() => {
                setOpen((o) => !o)
                if (!open) markNoticesRead()
              }}
            >
              ⌘
              {unread && <span className="dot" />}
            </button>
            {open && (
              <div className="tray">
                <header>
                  Messages
                  <button className="btn ghost small" onClick={() => setOpen(false)}>
                    close
                  </button>
                </header>
                {notices.map((n) => (
                  <div key={n.id} className={`notice ${n.unread ? 'unread' : ''}`}>
                    <h4>{n.title}</h4>
                    <p>
                      {n.body} · {n.time}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <Outlet />
      </main>
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}
