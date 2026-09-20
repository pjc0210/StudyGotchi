import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="auth">
      <div className="auth-card">
        <h2>Not found</h2>
        <p className="muted">That page is not in this mock.</p>
        <Link href="/">Back to StudyGotchi</Link>
      </div>
    </div>
  )
}
