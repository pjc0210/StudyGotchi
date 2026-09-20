import { Text } from '@react-three/drei'
import { toonMaterial } from '../lib/toon'

/**
 * Procedural wooden signpost: post + framed board + 3D text (drei `<Text>`), local +Z is the
 * readable face. Sized in metres; scale the parent. Replaces the DOM pill labels at level 2.
 */
export function Signpost({ text, accent, height = 1.6, width = 1.6, fontSize = 0.22 }: { text: string; accent: string; height?: number; width?: number; fontSize?: number }) {
  const wood = toonMaterial('#9a7a55')
  const face = toonMaterial('#efd9a2')
  const boardH = fontSize * 1.9
  return (
    <group>
      <mesh position={[0, height * 0.5, 0]} material={wood}>
        <cylinderGeometry args={[0.05, 0.065, height, 7]} />
      </mesh>
      <group position={[0, height, 0.03]} rotation={[-0.1, 0, 0]}>
        <mesh material={face}>
          <boxGeometry args={[width, boardH, 0.08]} />
        </mesh>
        <mesh position={[0, 0, -0.005]} material={wood} scale={[1.05, 1.12, 0.9]}>
          <boxGeometry args={[width, boardH, 0.08]} />
        </mesh>
        <Text position={[0, 0, 0.05]} fontSize={fontSize} color="#3a2f45" anchorX="center" anchorY="middle" maxWidth={width * 0.92} textAlign="center" outlineWidth={0.006} outlineColor={accent} fontWeight="bold">
          {text}
        </Text>
      </group>
    </group>
  )
}
