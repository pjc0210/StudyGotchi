'use client'

import Link from 'next/link'
import type { PublicAccount } from '@/lib/db/users'

export function PeerChrome({
  account,
  view,
}: {
  account: PublicAccount
  view: 'earth' | 'map'
}) {
  return (
    <div className="peer-chrome">
      <Link href="/friends" className="peer-back">
        Friends
      </Link>
      <p className="peer-kicker">Peering into</p>
      <h1>{account.name}</h1>
      <p className="peer-handle">
        {account.handle}
        <span aria-hidden="true"> · </span>
        {account.email}
      </p>
      <nav className="peer-tabs" aria-label={`${account.name}'s world`}>
        <Link
          href={`/friends/${account.id}/earth`}
          className={view === 'earth' ? 'active' : undefined}
        >
          Earth
        </Link>
        <Link
          href={`/friends/${account.id}/graph`}
          className={view === 'map' ? 'active' : undefined}
        >
          Map
        </Link>
      </nav>
    </div>
  )
}
