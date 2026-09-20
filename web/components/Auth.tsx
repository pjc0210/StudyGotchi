'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SiteHeader } from '@/components/SiteHeader'
import { useStore } from '@/lib/store'

export function LoginPage() {
  const { pendingTwoFactor, login } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (pendingTwoFactor) router.replace('/2fa')
  }, [pendingTwoFactor, router])

  if (pendingTwoFactor) return null

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const result = await login(email, password)
    if (result === 'ok') router.push('/earth')
    else if (result === '2fa') router.push('/2fa')
    else setError(result)
  }

  return (
    <div className="login-page">
      <SiteHeader />
      <form className="login-form" onSubmit={onSubmit}>
        <h1>Login</h1>
        {error && <p className="error">{error}</p>}
        <input
          className="login-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="Login"
          aria-label="Login"
        />
        <input
          className="login-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="Password"
          aria-label="Password"
        />
        <button className="login-submit" type="submit">
          Login
        </button>
        <div className="login-links">
          <Link href="/forgot">Forgot password</Link>
          <Link href="/register">Register</Link>
        </div>
      </form>
    </div>
  )
}

export function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState(false)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    if (!email.includes('@')) {
      setError('Use a valid email.')
      return
    }
    if (!password) {
      setError('Password is required.')
      return
    }
    setError(null)
    setCreated(true)
  }

  return (
    <div className="login-page">
      <SiteHeader />
      <form className="login-form" onSubmit={onSubmit}>
        <h1>Register</h1>
        {error && <p className="error">{error}</p>}
        {created ? (
          <>
            <p className="login-success">You&apos;re registered. You can log in now.</p>
            <Link className="login-submit" href="/login">
              Login
            </Link>
          </>
        ) : (
          <>
            <input
              className="login-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Name"
              aria-label="Name"
            />
            <input
              className="login-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="Email"
              aria-label="Email"
            />
            <input
              className="login-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Password"
              aria-label="Password"
            />
            <button className="login-submit" type="submit">
              Register
            </button>
            <div className="login-links">
              <Link href="/login">Login</Link>
            </div>
          </>
        )}
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
          <Link href="/login">Back to login</Link>
        </div>
      </form>
    </div>
  )
}

export function TwoFactorPage() {
  const { ready, pendingTwoFactor, verifyTwoFactor, user } = useStore()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!ready) return
    if (user) router.replace('/earth')
    else if (!pendingTwoFactor) router.replace('/login')
  }, [ready, user, pendingTwoFactor, router])

  if (ready && (user || !pendingTwoFactor)) return null

  return (
    <div className="auth">
      <form
        className="auth-card"
        onSubmit={async (e) => {
          e.preventDefault()
          if (await verifyTwoFactor(code)) router.push('/earth')
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
