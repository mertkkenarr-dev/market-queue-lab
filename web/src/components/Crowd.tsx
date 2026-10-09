import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, MathUtils, Object3D, type InstancedMesh } from 'three'
import type { ClockRef } from '../hooks/usePlayback'
import { buildCart, buildLoad } from '../lib/cart'
import { createCrowdMaterial } from '../lib/crowdMaterial'
import { attachInstanceAttributes, makeAgentState, stylesFor } from '../lib/crowdState'
import { buildHumanoid } from '../lib/humanoid'
import { DOOR, EXIT } from '../lib/layout'
import { COLORS } from '../lib/palette'
import { frameAt, HIDDEN, LEAVING, makeBuffers, WAITING } from '../lib/replay'
import type { Journey, LayoutKind, ReplayStats } from '../types/scenario'

interface Props {
  journeys: readonly Journey[]
  layout: LayoutKind
  lanes: number
  clock: ClockRef
  statsRef: { current: ReplayStats }
}

const MAX_SPEED = 3.4
const FULL_PRESSURE_SECONDS = 180
const CART_AHEAD = 0.85
const calm = new Color(COLORS.shelf)
const accent = new Color(COLORS.accent)
const mix = new Color()
const PRODUCT_TONES = ['#c8553d', '#e0b84c', '#4f8a5b', '#2f6f8f', '#d8d2c4', '#b5486a']

/**
 * Figürler gerçek yürüme hızıyla hedeflerine gider (simülasyon hızından bağımsız): yoksa ×90'da ışınlanır.
 * Bekleyenin altındaki halka bekleme süresiyle sarıya döner; kıyafet rengi veri taşımaz, gerçekçi kalır.
 */
export function Crowd({ journeys, layout, lanes, clock, statsRef }: Props) {
  const n = journeys.length
  const body = useRef<InstancedMesh>(null)
  const cart = useRef<InstancedMesh>(null)
  const load = useRef<InstancedMesh>(null)
  const ring = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const target = useMemo(() => makeBuffers(n), [n])
  const agents = useMemo(() => makeAgentState(n), [n])
  const epoch = useRef(clock.current.epoch)
  const { geometry, move, material, uTime } = useMemo(() => {
    const geometry = buildHumanoid()
    const { move } = attachInstanceAttributes(geometry, stylesFor(n), -0.85)
    return { geometry, move, ...createCrowdMaterial() }
  }, [n])
  const cartGeo = useMemo(buildCart, [])
  const loadGeo = useMemo(buildLoad, [])

  useEffect(() => {
    const l = load.current
    if (!l) return
    journeys.forEach((j, i) => l.setColorAt(i, mix.set(PRODUCT_TONES[(i * 7 + j.items) % PRODUCT_TONES.length] as string)))
    if (l.instanceColor) l.instanceColor.needsUpdate = true
  }, [journeys])
  useEffect(() => () => { geometry.dispose(); material.dispose(); cartGeo.dispose(); loadGeo.dispose() }, [geometry, material, cartGeo, loadGeo])

  useFrame((_, rawDt) => {
    const meshes = [body.current, cart.current, load.current, ring.current]
    if (n === 0 || meshes.some((m) => !m)) return
    const dt = Math.min(rawDt, 0.1)
    if (epoch.current !== clock.current.epoch) {
      epoch.current = clock.current.epoch
      agents.phase.fill(0)
      agents.move.fill(0)
    }
    statsRef.current = frameAt(journeys, clock.current.t, layout, lanes, target)
    uTime.value += dt

    for (let i = 0; i < n; i++) {
      const st = target.state[i] as number
      const a = agents
      if (a.phase[i] === 3 || (a.phase[i] === 0 && st === HIDDEN) || (a.phase[i] === 0 && st === LEAVING)) {
        hide(dummy, i, body.current as InstancedMesh, cart.current as InstancedMesh, load.current as InstancedMesh, ring.current as InstancedMesh)
        continue
      }
      if (a.phase[i] === 0) { a.phase[i] = 1; a.x[i] = DOOR.x; a.z[i] = DOOR.z; a.yaw[i] = Math.atan2(1, -0.2) }
      if (st === LEAVING) a.phase[i] = 2
      const toExit = a.phase[i] === 2 || st === HIDDEN
      if (toExit) a.phase[i] = 2
      const tx = toExit ? EXIT.x : (target.tx[i] as number)
      const tz = toExit ? EXIT.z : (target.tz[i] as number)
      const dx = tx - (a.x[i] as number)
      const dz = tz - (a.z[i] as number)
      const d = Math.hypot(dx, dz)
      if (toExit && d < 0.4) { a.phase[i] = 3; hide(dummy, i, body.current as InstancedMesh, cart.current as InstancedMesh, load.current as InstancedMesh, ring.current as InstancedMesh); continue }
      const walking = d > 0.06
      if (walking) {
        const step = Math.min(d, Math.min(MAX_SPEED, 0.6 + d * 2.2) * dt)
        a.x[i] = (a.x[i] as number) + (dx / d) * step
        a.z[i] = (a.z[i] as number) + (dz / d) * step
      }
      a.move[i] = (a.move[i] as number) + ((walking ? 1 : 0) - (a.move[i] as number)) * (1 - Math.exp(-dt * 9))
      const wantYaw = walking && d > 0.25 ? Math.atan2(dx, dz) : Math.PI
      const diff = MathUtils.euclideanModulo(wantYaw - (a.yaw[i] as number) + Math.PI, Math.PI * 2) - Math.PI
      a.yaw[i] = (a.yaw[i] as number) + diff * (1 - Math.exp(-dt * 8))
      place(dummy, i, a, body.current as InstancedMesh, 0, 1)
      move.setX(i, a.move[i] as number)
      const fx = Math.sin(a.yaw[i] as number) * CART_AHEAD
      const fz = Math.cos(a.yaw[i] as number) * CART_AHEAD
      dummy.position.set((a.x[i] as number) + fx, 0, (a.z[i] as number) + fz)
      dummy.rotation.set(0, a.yaw[i] as number, 0)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      ;(cart.current as InstancedMesh).setMatrixAt(i, dummy.matrix)
      const jr = journeys[i] as Journey
      const unloaded = Math.min(1, Math.max(0, (clock.current.t - jr.start) / (jr.end - jr.start) * 1.3))
      dummy.scale.set(1, 0.02 + 0.28 * Math.min(1, jr.items / 40) * (1 - unloaded), 1)
      dummy.position.y = 0.46
      dummy.updateMatrix()
      ;(load.current as InstancedMesh).setMatrixAt(i, dummy.matrix)
      const waiting = st === WAITING
      dummy.position.set(a.x[i] as number, 0.012, a.z[i] as number)
      dummy.rotation.set(-Math.PI / 2, 0, 0)
      dummy.scale.setScalar(waiting ? 1 : 0)
      dummy.updateMatrix()
      ;(ring.current as InstancedMesh).setMatrixAt(i, dummy.matrix)
      const pressure = Math.min(1, (target.waited[i] as number) / FULL_PRESSURE_SECONDS)
      ;(ring.current as InstancedMesh).setColorAt(i, mix.copy(calm).lerp(accent, pressure))
    }
    for (const m of meshes) if (m) m.instanceMatrix.needsUpdate = true
    move.needsUpdate = true
    const ic = ring.current?.instanceColor
    if (ic) ic.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh key={`b${n}`} ref={body} args={[geometry, material, Math.max(n, 1)]} frustumCulled={false} castShadow />
      <instancedMesh key={`c${n}`} ref={cart} args={[cartGeo, undefined, Math.max(n, 1)]} frustumCulled={false} castShadow>
        <meshStandardMaterial color="#9aa7a2" metalness={0.5} roughness={0.45} />
      </instancedMesh>
      <instancedMesh key={`l${n}`} ref={load} args={[loadGeo, undefined, Math.max(n, 1)]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh key={`r${n}`} ref={ring} args={[undefined, undefined, Math.max(n, 1)]} frustumCulled={false}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial transparent opacity={0.85} depthWrite={false} />
      </instancedMesh>
    </group>
  )
}

function place(d: Object3D, i: number, a: ReturnType<typeof makeAgentState>, mesh: InstancedMesh, y: number, s: number): void {
  d.position.set(a.x[i] as number, y, a.z[i] as number)
  d.rotation.set(0, a.yaw[i] as number, 0)
  d.scale.setScalar(s)
  d.updateMatrix()
  mesh.setMatrixAt(i, d.matrix)
}

function hide(d: Object3D, i: number, ...meshes: InstancedMesh[]): void {
  d.scale.setScalar(0)
  d.position.set(0, -10, 0)
  d.updateMatrix()
  for (const m of meshes) m.setMatrixAt(i, d.matrix)
}
