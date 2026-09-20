import * as THREE from 'three'
import { conceptState, type Cluster, type Concept } from './world'
import { hashString, makeRng } from './seed'
import type { Topic } from './galaxy'

export type Stage = 1 | 2 | 3

/** a topic earns its single grand landmark once this fraction of its concepts is demonstrated (Island / Planet rule) */
export const CAPSTONE_AT = 0.6

/** where a scene wants a concept spot drawn (foot at `position`, +Y along the local up) */
export interface SpotPlacement {
  concept: Concept
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  scale: number
}

/** where a scene wants a topic's plaza landmark drawn (Planet 2-zoom only) */
export interface PlazaPlacement {
  topic: Topic
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  scale: number
}

/**
 * Island / Planet grammar: every touched concept is a stage-1 sprout, every demonstrated concept a
 * stage-2 landmark, and each cluster gets exactly ONE stage-3 monument, on its first concept, once
 * >= 60% of the cluster's concepts are demonstrated. Returns the stage per concept.
 */
export function landmarkPlan(concepts: Concept[], progress: number): Map<Concept, Stage> {
  const byCluster = new Map<Cluster, Concept[]>()
  for (const c of concepts) {
    let list = byCluster.get(c.cluster)
    if (!list) byCluster.set(c.cluster, (list = []))
    list.push(c)
  }
  const plan = new Map<Concept, Stage>()
  for (const list of byCluster.values()) {
    list.sort((a, b) => a.index - b.index)
    const built = list.filter((c) => conceptState(c, progress) === 2).length
    const capstone = built / list.length >= CAPSTONE_AT ? list[0] : null
    for (const c of list) {
      const st = conceptState(c, progress)
      if (st === 0 && c !== capstone) continue
      plan.set(c, c === capstone ? 3 : st === 2 ? 2 : 1)
    }
  }
  return plan
}

/** demonstrated fraction d of a topic (layout grammar §a) */
export function topicFraction(topic: Topic, progress: number) {
  if (!topic.spots.length) return 0
  return topic.spots.filter((c) => conceptState(c, progress) === 2).length / topic.spots.length
}

/** plaza landmark stage from d: 0 → none, < 0.5 → s1, < 1 → s2, 1 → s3 */
export function plazaStage(topic: Topic, progress: number): Stage | 0 {
  const d = topicFraction(topic, progress)
  if (d <= 0) return 0
  if (d < 0.5) return 1
  if (d < 1 - 1e-6) return 2
  return 3
}

/** seeded yaw in 90° steps so identical stage-2 files do not all face the same way */
export function landmarkYaw(concept: Concept): number {
  const rng = makeRng(hashString('yaw:' + concept.cluster.name + ':' + concept.index))
  return Math.floor(rng() * 4) * (Math.PI / 2)
}

/** seeded variant index for files that ship as s2 / s2b / s2c */
export function landmarkVariant(key: string, n: number): number {
  if (n <= 1) return 0
  const rng = makeRng(hashString('variant:' + key))
  return Math.floor(rng() * n)
}

/** accent colour pulled ~15% toward the topic's terrain tint, as a hex string */
export function tintAccent(accent: string, tint: string, k = 0.15): string {
  return '#' + new THREE.Color(accent).lerp(new THREE.Color(tint), k).getHexString()
}

const _z = new THREE.Vector3()
const _to = new THREE.Vector3()
const _c = new THREE.Vector3()
/** yaw (rad, about local +Y) that turns local +Z of the frame `q` at `dir` toward `target` on the sphere */
export function yawToward(dir: THREE.Vector3, q: THREE.Quaternion, target: THREE.Vector3): number {
  _z.set(0, 0, 1).applyQuaternion(q)
  _to.copy(target).addScaledVector(dir, -target.dot(dir))
  if (_to.lengthSq() < 1e-8) return 0
  _to.normalize()
  return Math.atan2(_c.crossVectors(_z, _to).dot(dir), _z.dot(_to))
}
