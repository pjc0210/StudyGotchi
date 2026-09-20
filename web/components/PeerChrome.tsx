'use client'

import Link from 'next/link'
import type { Friend } from '@/lib/friends'

export function PeerChrome({
  friend,
  view,
}: {
  friend: Friend
  view: 'earth' | 'graph'
}) {
  return (
    <div className="peer-chrome">
      <Link href="/friends" className="peer-back">
        Friends
      </Link>
      <p className="peer-kicker">Peering into</p>
      <h1>{friend.name}</h1>
      <p className="peer-handle">
        {friend.handle}
        <span aria-hidden="true"> · </span>
        {friend.school}
      </p>
      <nav className="peer-tabs" aria-label={`${friend.name}'s world`}>
        <Link
          href={`/friends/${friend.id}/earth`}
          className={view === 'earth' ? 'active' : undefined}
        >
          Earth
        </Link>
        <Link
          href={`/friends/${friend.id}/graph`}
          className={view === 'graph' ? 'active' : undefined}
        >
          Graph
        </Link>
      </nav>
    </div>
  )
}
