import { useEffect, useState } from 'react'
import { openLanesCenter } from '../lib/layout'
import { buildSerpentine, type Tape } from '../lib/serpentine'

const POST_HEIGHT = 0.95
const TAPE_Y = 0.82

function TapeSegment({ t }: { t: Tape }) {
  const dx = t.b.x - t.a.x
  const dz = t.b.z - t.a.z
  const len = Math.hypot(dx, dz)
  return (
    <mesh position={[(t.a.x + t.b.x) / 2, TAPE_Y, (t.a.z + t.b.z) / 2]} rotation-y={Math.atan2(dx, dz)}>
      <boxGeometry args={[0.025, 0.07, len]} />
      <meshStandardMaterial color="#b8962a" roughness={0.6} />
    </mesh>
  )
}

/**
 * Ortak kuyruğun direkleri ve şeritleri, müşterilerin izlediği kıvrımlı yolla aynı geometriden çizilir.
 * Kuyruk uzadıkça satır eklenir (gerçek mağazalarda da şerit sonradan gerilir); satır sayısı sahneden okunur.
 */
export function PooledGuides({ lanes, rowsRef }: { lanes: number; rowsRef: { current: number } }) {
  const [rows, setRows] = useState(rowsRef.current)
  useEffect(() => {
    const id = window.setInterval(() => setRows((r) => (r === rowsRef.current ? r : rowsRef.current)), 150)
    return () => window.clearInterval(id)
  }, [rowsRef])
  const snake = buildSerpentine(openLanesCenter(lanes), rows)
  return (
    <group>
      {snake.posts.map((p) => (
        <mesh key={`${p.x.toFixed(1)}:${p.z.toFixed(1)}`} position={[p.x, POST_HEIGHT / 2, p.z]} castShadow>
          <cylinderGeometry args={[0.035, 0.05, POST_HEIGHT, 10]} />
          <meshStandardMaterial color="#3a4a44" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {snake.tapes.map((t, i) => (
        <TapeSegment key={i} t={t} />
      ))}
    </group>
  )
}
