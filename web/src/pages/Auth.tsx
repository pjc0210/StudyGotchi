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
        <p className="auth-kicker">StudyGotchi</p>
        <h2>Log in</h2>
        <p className="muted">{DEMO_PASSWORD_HINT}</p>
        {error && <p className="error">{error}</p>}
        <label className="field">
          <span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="auth-submit" type="submit">
          Login
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
        <h2>Register</h2>
        <p className="muted">Mock account — stored only in this browser.</p>
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
        <button className="auth-submit" type="submit">
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
        <p className="muted">This mock does not send mail.</p>
        <label className="field">
          <span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <button className="auth-submit" type="submit">
          Send reset
        </button>
        {sent && <p>Reset queued in the mock.</p>}
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
        <h2>Two-factor</h2>
        <p className="muted">Enter 123456.</p>
        {error && <p className="error">{error}</p>}
        <label className="field">
          <span>Code</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" />
        </label>
        <button className="auth-submit" type="submit">
          Verify
        </button>
      </form>
    </div>
  )
}
