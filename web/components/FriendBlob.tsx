'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import type { PublicAccount } from '@/lib/db/users'

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
}

export function FriendBlob({
  account,
  open,
  onToggle,
  onClose,
}: {
  account: PublicAccount
  open: boolean
  onToggle: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const theta = (account.angle * Math.PI) / 180
  const left = 50 + Math.sin(theta) * 46
  const top = 50 - Math.cos(theta) * 46

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <div
      ref={ref}
      className={`friend-blob${open ? ' is-open' : ''}`}
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      <button
        type="button"
        className="friend-blob-hit"
        aria-expanded={open}
        aria-label={`${account.name}, ${account.handle}`}
        onClick={onToggle}
      >
        <span
          className="friend-blob-body"
          style={{ background: account.color }}
          aria-hidden="true"
        >
          {initials(account.name)}
        </span>
        <span className="friend-blob-name">{account.name}</span>
      </button>
      {open ? (
        <div className="friend-bubble" role="dialog" aria-label={`${account.name}'s world`}>
          <p>
            View {account.name}&apos;s earth or map?
          </p>
          <div className="friend-bubble-actions">
            <Link href={`/friends/${account.id}/earth`}>Earth</Link>
            <Link href={`/friends/${account.id}/graph`}>Map</Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
