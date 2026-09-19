import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { WorldStage } from '../components/WorldStage'
import { useStore } from '../store'

export function FriendsPage() {
  const { friends, addFriend } = useStore()
  const [handle, setHandle] = useState('')
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const err = addFriend(handle)
    setError(err)
    if (!err) setHandle('')
  }

  return (
    <div>
      <h2 className="serif" style={{ marginTop: 0, fontSize: 34 }}>
        Friends
      </h2>
      <p className="muted">Add users in-game, visit their worlds, and leave placeholder exchanges (items/characters come later).</p>
      <form className="search-row" onSubmit={onSubmit}>
        <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="Add by handle, e.g. ada" />
        <button className="btn" type="submit">
          Add friend
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <section className="card">
        {friends.map((f) => (
          <div className="friend-row" key={f.id}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div className="avatar" style={{ background: f.worldTint }}>
                {f.name[0]}
              </div>
              <div>
                <strong>{f.name}</strong>
                <div className="muted">
                  {f.handle} · {f.creature} · {f.mood}
                </div>
              </div>
            </div>
            <Link className="btn small" to={`/friends/${f.id}`}>
              View world
            </Link>
          </div>
        ))}
      </section>
    </div>
  )
}

export function FriendWorldPage() {
  const { id } = useParams()
  const { friends, pushToast } = useStore()
  const friend = friends.find((f) => f.id === id)

  if (!friend) {
    return (
      <p>
        Unknown traveler. <Link to="/friends">Back</Link>
      </p>
    )
  }

  return (
    <div>
      <p>
        <Link to="/friends">← Friends</Link>
      </p>
      <h2 className="serif" style={{ marginTop: 0 }}>
        {friend.name}’s world
      </h2>
      <p className="muted">Interaction is mocked: exchange a lantern seed or wave. Real item/character trades will live elsewhere.</p>
      <div className="card">
        <WorldStage name={friend.creature} mood={friend.mood} tint={friend.worldTint} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn lantern" onClick={() => pushToast(`You waved at ${friend.handle}.`)}>
            Wave
          </button>
          <button className="btn" onClick={() => pushToast(`Offered a lantern seed to ${friend.creature}.`)}>
            Exchange item
          </button>
        </div>
      </div>
    </div>
  )
}
