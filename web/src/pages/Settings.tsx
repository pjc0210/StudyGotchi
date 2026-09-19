import { useState, type FormEvent } from 'react'
import { useStore } from '../store'

export function SettingsPage() {
  const { user, updateUser } = useStore()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [handle, setHandle] = useState(user?.handle ?? '')
  const [twoFactor, setTwoFactor] = useState(user?.twoFactor ?? false)

  if (!user) return null

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    updateUser({ name, email, handle, twoFactor })
  }

  return (
    <div>
      <h2 className="serif" style={{ marginTop: 0, fontSize: 34 }}>
        Account settings
      </h2>
      <p className="muted">Login, register, reset, and 2FA are mocked in the browser. Toggle email 2FA here — next login with an email containing “2fa” also forces the challenge.</p>
      <form className="card" style={{ maxWidth: 520 }} onSubmit={onSubmit}>
        <label className="field">
          <span>Display name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>In-game handle</span>
          <input value={handle} onChange={(e) => setHandle(e.target.value)} />
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
          <input type="checkbox" checked={twoFactor} onChange={(e) => setTwoFactor(e.target.checked)} />
          Require email / authenticator 2FA
        </label>
        <label className="field">
          <span>New password (mock, not stored)</span>
          <input type="password" placeholder="••••" />
        </label>
        <button className="btn" type="submit">
          Save settings
        </button>
      </form>
    </div>
  )
}
