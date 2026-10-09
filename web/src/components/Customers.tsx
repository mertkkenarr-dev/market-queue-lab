import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, Object3D, type InstancedMesh } from 'three'
import type { ClockRef } from '../hooks/usePlayback'
import { DOOR } from '../lib/layout'
import { COLORS } from '../lib/palette'
import { frameAt, HIDDEN, makeBuffers, WAITING } from '../lib/replay'
import type { Journey, LayoutKind, ReplayStats } from '../types/scenario'

interface Props {
  journeys: readonly Journey[]
  layout: LayoutKind
  lanes: number
  clock: ClockRef
  statsRef: { current: ReplayStats }
}

const HEIGHT = 0.46
const FULL_PRESSURE_SECONDS = 180
const ink = new Color(COLORS.ink)
const accent = new Color(COLORS.accent)
const mix = new Color()

/**
 * Müşteriler React state'inde değil düz dizilerde yaşar; her karede yalnızca matris ve renk yazılır.
 * Renk, bekleme süresiyle mürekkepten sarıya geçer: sarı yalnızca bekleme baskısını gösterir.
 */
export function Customers({ journeys, layout, lanes, clock, statsRef }: Props) {
  const mesh = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const n = journeys.length
  const target = useMemo(() => makeBuffers(n), [n])
  const cur = useMemo(() => ({ x: new Float32Array(n), z: new Float32Array(n), visible: new Uint8Array(n) }), [n])

  useFrame((_, dt) => {
    const m = mesh.current
    if (!m || n === 0) return
    statsRef.current = frameAt(journeys, clock.current.t, layout, lanes, target)
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 7)
    for (let i = 0; i < n; i++) {
      if (target.state[i] === HIDDEN) {
        cur.visible[i] = 0
        dummy.scale.setScalar(0)
      } else {
        if (!cur.visible[i]) {
          cur.visible[i] = 1
          cur.x[i] = DOOR.x
          cur.z[i] = DOOR.z
        }
        cur.x[i] = (cur.x[i] as number) + ((target.tx[i] as number) - (cur.x[i] as number)) * k
        cur.z[i] = (cur.z[i] as number) + ((target.tz[i] as number) - (cur.z[i] as number)) * k
        dummy.scale.setScalar(1)
      }
      dummy.position.set(cur.x[i] as number, HEIGHT / 2, cur.z[i] as number)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      const pressure = target.state[i] === WAITING ? Math.min(1, (target.waited[i] as number) / FULL_PRESSURE_SECONDS) : 0
      m.setColorAt(i, mix.copy(ink).lerp(accent, pressure))
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh key={n} ref={mesh} args={[undefined, undefined, Math.max(n, 1)]} frustumCulled={false}>
      <capsuleGeometry args={[0.13, 0.2, 3, 8]} />
      <meshLambertMaterial />
    </instancedMesh>
  )
}
