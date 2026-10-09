import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, Object3D, type InstancedMesh } from 'three'
import type { ClockRef } from '../hooks/usePlayback'
import { BELT_LENGTH, DESK_Z, laneX } from '../lib/layout'
import type { Journey } from '../types/scenario'

const PER_LANE = 10
const TONES = ['#c8553d', '#e0b84c', '#4f8a5b', '#2f6f8f', '#d8d2c4', '#b5486a']

/**
 * Banttaki ürünler hizmet ilerlemesine bağlı: müşterinin gerçek ürün sayısı kadar (en çok 10 görünür)
 * ürün arabadan bandın müşteri ucuna girer, kasiyere doğru kayar ve orada taranıp kaybolur.
 */
export function BeltItems({ journeys, lanes, clock }: { journeys: readonly Journey[]; lanes: number; clock: ClockRef }) {
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const count = lanes * PER_LANE
  const colors = useMemo(() => Array.from({ length: count }, (_, i) => new Color(TONES[i % TONES.length] as string)), [count])

  useFrame(() => {
    const m = ref.current
    if (!m) return
    const t = clock.current.t
    const used = new Uint8Array(count)
    const slots = new Uint8Array(lanes)
    for (let i = 0; i < journeys.length; i++) {
      const j = journeys[i] as Journey
      if (t < j.start || t >= j.scanEnd) continue
      const p = (t - j.start) / (j.scanEnd - j.start)
      const n = Math.min(PER_LANE, j.items)
      const zFar = DESK_Z + 0.3 + BELT_LENGTH - 0.2
      const zNear = DESK_Z + 0.55
      for (let q = 0; q < n; q++) {
        const u = p * 1.5 - (q / n) * 0.5
        if (u <= 0 || u >= 1) continue
        const slot = slots[j.lane] as number
        if (slot >= PER_LANE) break
        slots[j.lane] = slot + 1
        const idx = j.lane * PER_LANE + slot
        used[idx] = 1
        dummy.position.set(laneX(j.lane) + ((q % 3) - 1) * 0.1, 0.9, zFar - u * (zFar - zNear))
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        m.setMatrixAt(idx, dummy.matrix)
        m.setColorAt(idx, colors[(i + q) % colors.length] as Color)
      }
    }
    for (let r = 0; r < count; r++) {
      if (used[r]) continue
      dummy.scale.setScalar(0)
      dummy.updateMatrix()
      m.setMatrixAt(r, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh key={count} ref={ref} args={[undefined, undefined, count]} frustumCulled={false} castShadow>
      <boxGeometry args={[0.14, 0.12, 0.14]} />
      <meshStandardMaterial roughness={0.6} />
    </instancedMesh>
  )
}
