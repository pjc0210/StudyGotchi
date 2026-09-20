'use client'

import Link from 'next/link'
import { EarthGlobe } from '@/components/EarthGlobe'
import { SiteHeader } from '@/components/SiteHeader'
import { FRIENDS } from '@/lib/friends'

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
}

export function FriendsView() {
  return (
    <div className="earth-page is-friends">
      <SiteHeader />
      <aside className="course-overlay friends-overlay">
        <h1>Friends</h1>
        <p>Everyone you study with. Open a world to peer into their earth or graph.</p>
        <ul className="friend-list">
          {FRIENDS.map((friend) => (
            <li key={friend.id}>
              <div className="friend-card-head">
                <span className="friend-avatar" aria-hidden="true">
                  {initials(friend.name)}
                </span>
                <div>
                  <span className="friend-name">{friend.name}</span>
                  <span className="friend-handle">{friend.handle}</span>
                </div>
              </div>
              <p className="friend-blurb">{friend.blurb}</p>
              <ul className="friend-courses">
                {friend.courses.map((course) => (
                  <li key={course.code}>{course.code}</li>
                ))}
              </ul>
              <div className="friend-actions">
                <Link href={`/friends/${friend.id}/earth`}>Earth</Link>
                <Link href={`/friends/${friend.id}/graph`}>Graph</Link>
              </div>
            </li>
          ))}
        </ul>
      </aside>
      <EarthGlobe />
    </div>
  )
}
