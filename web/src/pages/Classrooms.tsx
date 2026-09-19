import { useMemo, useState, type FormEvent } from 'react'
import { KnowledgeGraph } from '../components/KnowledgeGraph'
import { useStore } from '../store'

export function ClassroomsPage() {
  const { classrooms, joinClassroom, createClassroom, files, graphQuery } = useStore()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [active, setActive] = useState(classrooms[0]?.id ?? '')
  const [topicFilter, setTopicFilter] = useState<string | 'all'>('all')

  const room = classrooms.find((c) => c.id === active) ?? classrooms[0]
  const sharedFiles = files.filter((f) => f.classroomId === room?.id && f.appliedToClassroom)
  const topics = useMemo(() => {
    const set = new Set<string>()
    room?.sharedTopics.forEach((t) => set.add(t))
    sharedFiles.forEach((f) => f.topics.forEach((t) => set.add(t)))
    return [...set]
  }, [room, sharedFiles])

  const onJoin = (e: FormEvent) => {
    e.preventDefault()
    joinClassroom(code)
    setCode('')
  }

  const onCreate = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    createClassroom(name.trim())
    setName('')
  }

  return (
    <div>
      <h2 className="serif" style={{ marginTop: 0, fontSize: 34 }}>
        Classrooms
      </h2>
      <p className="muted">
        Anyone can create a room. Combined student maps show shared files and topics labelled for the course.
      </p>
      <div className="split">
        <form className="card" onSubmit={onJoin}>
          <h3>Join with a code</h3>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="LANTERN-06" />
          <button className="btn" style={{ marginTop: 10 }} type="submit">
            Join
          </button>
        </form>
        <form className="card" onSubmit={onCreate}>
          <h3>Create classroom</h3>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New course name" />
          <button className="btn lantern" style={{ marginTop: 10 }} type="submit">
            Create as instructor
          </button>
        </form>
      </div>
      <div className="legend" style={{ margin: '16px 0' }}>
        {classrooms.map((c) => (
          <button
            key={c.id}
            className={`chip ${c.id === room?.id ? 'on' : ''}`}
            onClick={() => setActive(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>
      {room && (
        <section className="card dark">
          <div className="card-head">
            <h3>
              Combined map · {room.name}
            </h3>
            <span className="muted">
              {room.members.length} members · you are {room.role}
            </span>
          </div>
          <div className="legend">
            <button className={`chip ${topicFilter === 'all' ? 'on' : ''}`} onClick={() => setTopicFilter('all')}>
              all shared topics
            </button>
            {topics.map((t) => (
              <button
                key={t}
                className={`chip ${topicFilter === t ? 'on' : ''}`}
                onClick={() => setTopicFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <KnowledgeGraph
            query={topicFilter === 'all' ? graphQuery : String(topicFilter)}
            classroomOnly
            owners={room.members}
          />
          <h4 style={{ fontFamily: 'Outfit, sans-serif' }}>Shared into this room</h4>
          {sharedFiles.length === 0 && <p className="muted">Nobody has applied a file yet.</p>}
          {sharedFiles.map((f) => (
            <div key={f.id} className="friend-row">
              <span>{f.name}</span>
              <span className="muted">{f.topics.join(', ')}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
