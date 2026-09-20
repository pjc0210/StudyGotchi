import { MARKERS, type MarkerDefinition, type MarkerId, type MarkerProp } from './markers'

export type LabMode = 'views' | 'review' | 'sheet' | 'planet'
export type PropCount = 2 | 3 | 4

export interface MarkerRenderState {
  markerId: MarkerId
  propCount: PropCount
  creature: boolean
  night: boolean
  mode: LabMode
}

export const CREATURE_HEIGHT = 4.5

export const INITIAL_STATE: MarkerRenderState = {
  markerId: 'ice-town',
  propCount: 4,
  creature: false,
  night: false,
  mode: 'review',
}

export function clampPropCount(value: number): PropCount {
  return Math.min(4, Math.max(2, Math.round(value))) as PropCount
}

export function visibleProps(marker: MarkerDefinition, count: PropCount): readonly MarkerProp[] {
  return marker.props.slice(0, count).filter((prop): prop is MarkerProp => prop !== undefined)
}

export function stateFromSearch(search: string): MarkerRenderState {
  const params = new URLSearchParams(search)
  const markerId = params.get('marker')
  const mode = params.get('mode')
  return {
    markerId: MARKERS.some((marker) => marker.id === markerId) ? (markerId as MarkerId) : INITIAL_STATE.markerId,
    propCount: clampPropCount(Number(params.get('props') ?? INITIAL_STATE.propCount)),
    creature: params.get('creature') === '1',
    night: params.get('night') === '1',
    mode: mode === 'views' || mode === 'sheet' || mode === 'planet' ? mode : 'review',
  }
}
