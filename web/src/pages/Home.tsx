import { Link } from 'react-router-dom'
import { KnowledgeGraph } from '../components/KnowledgeGraph'
import { WorldStage } from '../components/WorldStage'
import { useStore } from '../store'

export function HomePage() {
  const { graphQuery, setGraphQuery, creature, friends, classrooms, files } = useStore()

  return (
    <div>
      <h2 className="serif" style={{ margin: '0 0 8px', fontSize: 34 }}>
        Your living knowledge world
      </h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Overview of the neural map, Tamagotchi habitat, friends, and classrooms — all mock data until graph logic and the creature sim land elsewhere.
      </p>
      <div className="grid-home">
        <section className="card dark">
          <div className="card-head">
            <h3>Knowledge graph</h3>
            <Link className="btn lantern small" to="/graph">
              Zoom into map
            </Link>
          </div>
          <input
            placeholder="Search a topic — map re-clusters toward it"
            value={graphQuery}
            onChange={(e) => setGraphQuery(e.target.value)}
            style={{ width: '100%', marginBottom: 8, borderRadius: 10, border: 0, padding: '10px 12px' }}
          />
          <KnowledgeGraph query={graphQuery} compact />
        </section>
        <section className="card">
          <div className="card-head">
            <h3>Tamagotchi world</h3>
            <Link className="btn small" to="/world">
              Open habitat
            </Link>
          </div>
          <WorldStage name={creature.name} mood={creature.mood} />
          <p className="muted" style={{ marginBottom: 0 }}>
            Space reserved for the creature sim. Hunger {creature.hunger}% · study {creature.study}%
          </p>
        </section>
        <section className="card">
          <div className="card-head">
            <h3>Friends</h3>
            <Link className="btn ghost small" to="/friends">
              All friends
            </Link>
          </div>
          {friends.slice(0, 3).map((f) => (
            <div className="friend-row" key={f.id}>
              <div>
                <strong>{f.name}</strong>
                <div className="muted">
                  {f.handle} · {f.creature}
                </div>
              </div>
              <Link className="btn ghost small" to={`/friends/${f.id}`}>
                Visit
              </Link>
            </div>
          ))}
        </section>
        <section className="card">
          <div className="card-head">
            <h3>Classrooms & uploads</h3>
            <Link className="btn ghost small" to="/upload">
              Upload
            </Link>
          </div>
          <p className="muted">
            {files.length} materials ingested · {classrooms.length} classrooms
          </p>
          {classrooms.map((c) => (
            <div className="friend-row" key={c.id}>
              <div>
                <strong>{c.name}</strong>
                <div className="muted">
                  {c.role} · code {c.code}
                </div>
              </div>
              <Link className="btn ghost small" to="/classrooms">
                Combined map
              </Link>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
