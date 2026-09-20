'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DEMO_PASSWORD_HINT } from '@/lib/mock'
import { useStore } from '@/lib/store'

export function LoginPage() {
  const { ready, user, pendingTwoFactor, login } = useStore()
  const [email, setEmail] = useState('pj@studygotchi.app')
  const [password, setPassword] = useState('study')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!ready) return
    if (pendingTwoFactor) router.replace('/2fa')
    else if (user) router.replace('/earth')
  }, [ready, pendingTwoFactor, user, router])

  if (ready && (pendingTwoFactor || user)) return null

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const result = login(email, password)
    if (result === 'ok') router.push('/earth')
    else if (result === '2fa') router.push('/2fa')
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
          <Link href="/register">Register</Link>
          <Link href="/forgot">Forgot password</Link>
        </div>
      </form>
    </div>
  )
}

export function RegisterPage() {
  const { ready, user, register } = useStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (ready && user) router.replace('/earth')
  }, [ready, user, router])

  if (ready && user) return null

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const err = register(name, email, password)
    if (err) setError(err)
    else router.push('/earth')
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
          <Link href="/login">Already have one?</Link>
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
        onSubmit={(e) => {
          e.preventDefault()
          if (verifyTwoFactor(code)) router.push('/earth')
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
