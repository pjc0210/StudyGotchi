import { Html } from '@react-three/drei'
import type * as THREE from 'three'

/** Small DOM pill anchored to a world position (course codes, topic names). Never takes pointer events. */
export function Label({ position, text, color, small }: { position: THREE.Vector3 | [number, number, number]; text: string; color: string; small?: boolean }) {
  return (
    <Html position={position} center zIndexRange={[2, 0]} style={{ pointerEvents: 'none' }}>
      <div className={small ? 'label small' : 'label'} style={{ borderColor: color }}>
        {text}
      </div>
    </Html>
  )
}
