import { WorldStage } from '../components/WorldStage'
import { useStore } from '../store'

export function WorldPage() {
  const { creature, studyPulse, graphQuery } = useStore()

  return (
    <div>
      <h2 className="serif" style={{ marginTop: 0, fontSize: 34 }}>
        Tamagotchi habitat
      </h2>
      <p className="muted">
        Creature simulation will be developed elsewhere. This page is dedicated space for the world, stats, and study-feeding.
      </p>
      <div className="card">
        <WorldStage name={creature.name} mood={creature.mood} />
        <div className="stats">
          <div>
            <div className="muted">Hunger for knowledge</div>
            <div className="bar">
              <span style={{ width: `${creature.hunger}%` }} />
            </div>
          </div>
          <div>
            <div className="muted">Study glow</div>
            <div className="bar">
              <span style={{ width: `${creature.study}%`, background: 'var(--lantern)' }} />
            </div>
          </div>
        </div>
        <p>
          {graphQuery
            ? `Inkcap is leaning toward graph cluster “${graphQuery}”.`
            : 'Idle in the lantern grass. Search the graph and the world will gossip about it.'}
        </p>
        <button className="btn lantern" onClick={studyPulse}>
          Feed with a study session
        </button>
      </div>
    </div>
  )
}
