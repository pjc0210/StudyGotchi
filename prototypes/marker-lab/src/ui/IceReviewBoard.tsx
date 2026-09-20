import kirbyReference from '../../../../docs/design/world/refs/kirby-w3-pedestal.png?url'
import lighthouseReference from '../../../../docs/design/world/refs/penguin-isle-lighthouse-rock.png?url'
import { ICE_BOUQUET } from '../iceBouquet'
import { MARKERS, type MarkerDefinition } from '../markers'
import type { MarkerRenderState } from '../state'
import { Creature } from '../scene/Creature'
import { WorldProps } from '../scene/WorldProps'
import { MarkerViewport } from './MarkerViewport'

function MarkerContents({ marker, state }: { marker: MarkerDefinition; state: MarkerRenderState }) {
  return (
    <>
      <WorldProps marker={marker} propCount={state.propCount} night={state.night} />
      {state.creature && <Creature />}
    </>
  )
}

export function IceReviewBoard({
  marker,
  state,
  onReady,
}: {
  marker: MarkerDefinition
  state: MarkerRenderState
  onReady: (id: string) => void
}) {
  const ice = marker.id === 'ice-town'
  return (
    <section className="ice-review" aria-label={`${marker.name} bouquet review`}>
      <div className="review-heading">
        <div>
          <span className="marker-kicker">One plinth · one terrain mass · oversized landscape</span>
          <h2>{ice ? ICE_BOUQUET.name : marker.name}</h2>
        </div>
        <p>
          Direction <b>{ice ? 'Village bouquet' : marker.silhouette}</b>
        </p>
      </div>

      <div className="bouquet-review-grid">
        <div className="bouquet-hero">
          <MarkerViewport marker={marker} night={state.night} size={512} label="512 px construction view" onReady={() => onReady('512')}>
            <MarkerContents marker={marker} state={state} />
          </MarkerViewport>
        </div>
        <div className="bouquet-readouts">
          <div className="tiny-pair">
            <MarkerViewport marker={marker} night={state.night} size={48} label="48 px" onReady={() => onReady('48')}>
              <MarkerContents marker={marker} state={state} />
            </MarkerViewport>
            <MarkerViewport marker={marker} night={state.night} size={96} label="96 px" onReady={() => onReady('96')}>
              <MarkerContents marker={marker} state={state} />
            </MarkerViewport>
          </div>
          <div className="bouquet-notes">
            <p>{ice ? ICE_BOUQUET.description : `${marker.name} keeps the Ice bouquet grammar: one circular plinth and four oversized signature props bursting outward.`}</p>
            <ul>
              {ice ? (
                <>
                  <li>Three capped peaks form a visible 32 m mountain range.</li>
                  <li>28 m red-cap lighthouse uses a restrained outward curve.</li>
                  <li>28 m pines and two 24 m gabled houses stay on the plinth.</li>
                  <li>The cream house that hung off the edge is gone.</li>
                </>
              ) : (
                marker.props.filter((prop): prop is NonNullable<typeof prop> => Boolean(prop)).map((prop) => (
                  <li key={prop.id}>
                    {prop.height} m {prop.label}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>

      {ice && (
        <div className="reference-strip">
          <figure>
            <img src={kirbyReference} alt="Kirby world three snowy pedestal structural reference" />
            <figcaption>
              <b>Composition reference</b>
              <span>One low base and one dense landscape silhouette. The sign and exact prop arrangement are excluded.</span>
            </figcaption>
          </figure>
          <figure>
            <img src={lighthouseReference} alt="Penguin Isle lighthouse on an ice headland" />
            <figcaption>
              <b>Scale reference</b>
              <span>The lighthouse is intentionally oversized against its rock, with the red cap carrying the warm signal.</span>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  )
}

export function IceSizeViews({
  marker,
  state,
  onReady,
}: {
  marker: MarkerDefinition
  state: MarkerRenderState
  onReady: (id: string) => void
}) {
  return (
    <section className="size-views" aria-label="Fixed bouquet size views">
      {([48, 96, 512] as const).map((size) => (
        <MarkerViewport key={size} marker={marker} night={state.night} size={size} label={`${size} px`} onReady={() => onReady(String(size))}>
          <MarkerContents marker={marker} state={state} />
        </MarkerViewport>
      ))}
    </section>
  )
}

export function MarkerSheet({
  state,
  onReady,
}: {
  state: MarkerRenderState
  onReady: (id: string) => void
}) {
  return (
    <section className="marker-sheet" aria-label="17-marker sheet">
      {MARKERS.map((entry) => (
        <MarkerViewport key={entry.id} marker={entry} night={state.night} size={96} label={entry.name} onReady={() => onReady(entry.id)}>
          <WorldProps marker={entry} propCount={state.propCount} night={state.night} />
          {state.creature && <Creature />}
        </MarkerViewport>
      ))}
    </section>
  )
}
