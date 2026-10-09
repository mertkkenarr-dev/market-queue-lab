import { QUEUE_START_Z, STORE } from '../lib/layout'

const X_HALF = 3.1
const Z0 = QUEUE_START_Z - 0.4
const Z1 = STORE.halfD - 0.6
const POSTS: [number, number][] = [
  [-X_HALF, Z0], [X_HALF, Z0], [-X_HALF, (Z0 + Z1) / 2], [X_HALF, (Z0 + Z1) / 2], [-X_HALF, Z1], [X_HALF, Z1], [0, Z1],
]

/** Ortak kuyruğun direkli bariyeri: tek kıvrımlı blok kasalara bu çerçeveden dağılır. */
export function PooledGuides() {
  const depth = Z1 - Z0
  return (
    <group>
      {POSTS.map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.45, z]} castShadow>
          <cylinderGeometry args={[0.035, 0.05, 0.9, 10]} />
          <meshStandardMaterial color="#3a4a44" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {[-X_HALF, X_HALF].map((x) => (
        <mesh key={x} position={[x, 0.78, (Z0 + Z1) / 2]}>
          <boxGeometry args={[0.02, 0.05, depth]} />
          <meshStandardMaterial color="#c9a227" />
        </mesh>
      ))}
      <mesh position={[0, 0.78, Z1]}>
        <boxGeometry args={[X_HALF * 2, 0.05, 0.02]} />
        <meshStandardMaterial color="#c9a227" />
      </mesh>
    </group>
  )
}
