'use client'

import { useState } from 'react'
import { EarthGlobe } from '@/components/EarthGlobe'
import { FriendBlob } from '@/components/FriendBlob'
import { SiteHeader } from '@/components/SiteHeader'
import { findAccountByEmail, friendsOf } from '@/lib/db/users'
import { useStore } from '@/lib/store'

export function FriendsView() {
  const { user } = useStore()
  const self = user ? findAccountByEmail(user.email) : null
  const friends = friendsOf(self?.id)
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="earth-page is-friends">
      <SiteHeader />
      <EarthGlobe variant="friends">
        {friends.map((account) => (
          <FriendBlob
            key={account.id}
            account={account}
            open={openId === account.id}
            onToggle={() =>
              setOpenId((current) => (current === account.id ? null : account.id))
            }
            onClose={() => setOpenId(null)}
          />
        ))}
      </EarthGlobe>
    </div>
  )
}
