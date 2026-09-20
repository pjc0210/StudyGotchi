'use client'

import Link from 'next/link'
import { EarthView } from '@/components/EarthView'
import { GraphView } from '@/components/GraphView'
import { SiteHeader } from '@/components/SiteHeader'
import { getAccount, toPublic } from '@/lib/db/users'

function MissingFriend() {
  return (
    <div className="earth-page">
      <SiteHeader />
      <aside className="course-overlay">
        <h1>Not found</h1>
        <p>That classmate is not in the local mock.</p>
        <Link href="/friends">Friends</Link>
      </aside>
    </div>
  )
}

export function FriendPeerEarth({ id }: { id: string }) {
  const account = getAccount(id)
  if (!account) return <MissingFriend />
  return <EarthView peer={toPublic(account)} />
}

export function FriendPeerGraph({ id }: { id: string }) {
  const account = getAccount(id)
  if (!account) return <MissingFriend />
  return <GraphView peer={toPublic(account)} />
}
