import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { DEMO_PASSWORD_HINT } from '../mock'
import { useStore } from '../store'

export function LoginPage() {
  const { user, pendingTwoFactor, login } = useStore()
  const [email, setEmail] = useState('pj@studygotchi.app')
  const [password, setPassword] = useState('study')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  if (pendingTwoFactor) return <Navigate to="/2fa" replace />
  if (user) return <Navigate to="/earth" replace />

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const result = login(email, password)
    if (result === 'ok') navigate('/earth')
    else if (result === '2fa') navigate('/2fa')
    else setError(result)
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={onSubmit}>
        <p className="pixel" style={{ color: 'var(--moss-2)' }}>STUDYGOTCHI</p>
        <h2>Come back to your world</h2>
        <p className="muted">{DEMO_PASSWORD_HINT} Include “2fa” in the email to demo two-factor.</p>
        {error && <p className="error">{error}</p>}
        <label className="field">
          <span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn" type="submit" style={{ width: '100%' }}>
          Enter habitat
        </button>
        <div className="auth-links">
          <Link to="/register">Register</Link>
          <Link to="/forgot">Forgot password</Link>
        </div>
      </form>
    </div>
  )
}

export function RegisterPage() {
  const { user, register } = useStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  if (user) return <Navigate to="/earth" replace />

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const err = register(name, email, password)
    if (err) setError(err)
    else navigate('/earth')
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={onSubmit}>
        <h2>Grow a knowledge pet</h2>
        <p className="muted">Register an account. Auth is mocked locally — no server yet.</p>
        {error && <p className="error">{error}</p>}
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn" type="submit" style={{ width: '100%' }}>
          Create account
        </button>
        <div className="auth-links">
          <Link to="/login">Already have one?</Link>
        </div>
      </form>
    </div>
  )
}

export function ForgotPage() {
  const { requestReset } = useStore()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <div className="auth">
      <form
        className="auth-card"
        onSubmit={(e) => {
          e.preventDefault()
          requestReset(email || 'you@school.edu')
          setSent(true)
        }}
      >
        <h2>Forgot password</h2>
        <p className="muted">We’ll pretend to email a reset link. Check the toast at the top right.</p>
        <label className="field">
          <span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <button className="btn" type="submit" style={{ width: '100%' }}>
          Send reset
        </button>
        {sent && <p>Mock email queued.</p>}
        <div className="auth-links">
          <Link to="/login">Back to login</Link>
        </div>
      </form>
    </div>
  )
}

export function TwoFactorPage() {
  const { pendingTwoFactor, verifyTwoFactor, user } = useStore()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  if (user) return <Navigate to="/earth" replace />
  if (!pendingTwoFactor) return <Navigate to="/login" replace />

  return (
    <div className="auth">
      <form
        className="auth-card"
        onSubmit={(e) => {
          e.preventDefault()
          if (verifyTwoFactor(code)) navigate('/earth')
          else setError('Use mock code 123456.')
        }}
      >
        <h2>Email / 2FA</h2>
        <p className="muted">Prototype second factor. Enter 123456.</p>
        {error && <p className="error">{error}</p>}
        <label className="field">
          <span>Authenticator code</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" />
        </label>
        <button className="btn" type="submit" style={{ width: '100%' }}>
          Verify
        </button>
      </form>
    </div>
  )
}
