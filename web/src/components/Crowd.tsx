import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, Object3D, type InstancedMesh } from 'three'
import type { ClockRef } from '../hooks/usePlayback'
import { buildCart, buildLoad } from '../lib/cart'
import { createCrowdMaterial } from '../lib/crowdMaterial'
import { attachInstanceAttributes, stylesFor } from '../lib/crowdState'
import { buildHumanoid } from '../lib/humanoid'
import { DOOR, EXIT, openLanesCenter, QUEUE_GAP } from '../lib/layout'
import { corridorRoute, followPath, makeAgentState, NO_PENDING, resetAgents, retarget, separate, walk, type AgentState } from '../lib/movement'
import { COLORS } from '../lib/palette'
import { frameAt, HIDDEN, LEAVING, makeBuffers, WAITING } from '../lib/replay'
import { buildSerpentine, rowsNeeded, SNAKE, type Serpentine } from '../lib/serpentine'
import type { Journey, LayoutKind, ReplayStats } from '../types/scenario'

interface Props {
  journeys: readonly Journey[]
  layout: LayoutKind
  lanes: number
  clock: ClockRef
  statsRef: { current: ReplayStats }
  /** Ortak kuyrukta o ana dek kurulan en büyük satır sayısı; şeritleri çizen bileşenle paylaşılır. */
  snakeRows: { current: number }
}

const FULL_PRESSURE_SECONDS = 180
const CART_AHEAD = 0.85
const QUEUE_DELAY_PER_RANK = 0.1
const MAX_QUEUE_DELAY = 0.8
const calm = new Color(COLORS.shelf)
const accent = new Color(COLORS.accent)
const mix = new Color()
const PRODUCT_TONES = ['#c8553d', '#e0b84c', '#4f8a5b', '#2f6f8f', '#d8d2c4', '#b5486a']

type Meshes = { body: InstancedMesh; cart: InstancedMesh; load: InstancedMesh; ring: InstancedMesh }

/**
 * Her karede sırayla: (1) replay hedefleri, (2) gecikmeli hedef + yürüme, (3) ittirme, (4) çizim.
 * Figürler gerçek yürüme hızıyla gider (simülasyon hızından bağımsız), sıra arkaya doğru dalga gibi ilerler.
 * Bekleyenin altındaki halka bekleme süresiyle sarıya döner; kıyafet rengi veri taşımaz.
 */
export function Crowd({ journeys, layout, lanes, clock, statsRef, snakeRows }: Props) {
  const n = journeys.length
  const body = useRef<InstancedMesh>(null)
  const cart = useRef<InstancedMesh>(null)
  const load = useRef<InstancedMesh>(null)
  const ring = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const target = useMemo(() => makeBuffers(n), [n])
  const agents = useMemo(() => makeAgentState(n), [n])
  const visible = useMemo(() => new Int32Array(n), [n])
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
    const meshes = getMeshes(body.current, cart.current, load.current, ring.current)
    if (n === 0 || !meshes) return
    const dt = Math.min(rawDt, 0.1)
    if (epoch.current !== clock.current.epoch) {
      epoch.current = clock.current.epoch
      resetAgents(agents)
      snakeRows.current = SNAKE.minRows
    }
    statsRef.current = frameAt(journeys, clock.current.t, layout, lanes, target)
    uTime.value += dt
    let snake: Serpentine | null = null
    if (layout === 'pooled') {
      snakeRows.current = Math.max(snakeRows.current, rowsNeeded(statsRef.current.waiting + 2))
      snake = buildSerpentine(openLanesCenter(lanes), snakeRows.current)
    }
    const count = advanceAgents(agents, target, visible, dt, (i) => hide(dummy, i, meshes), snake)
    separate(agents, visible, count, dt)
    for (let p = 0; p < count; p++) drawAgent(visible[p] as number, agents, target, journeys, clock.current.t, dummy, meshes, move)
    for (const m of [meshes.body, meshes.cart, meshes.load, meshes.ring]) m.instanceMatrix.needsUpdate = true
    move.needsUpdate = true
    if (meshes.ring.instanceColor) meshes.ring.instanceColor.needsUpdate = true
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

function getMeshes(...m: (InstancedMesh | null)[]): Meshes | null {
  const [body, cart, load, ring] = m
  return body && cart && load && ring ? { body, cart, load, ring } : null
}

/** Görünen ajanları `visible` içine yazar ve sayısını döner; gizlenenler için `onHide` çağrılır. */
function advanceAgents(a: AgentState, target: ReturnType<typeof makeBuffers>, visible: Int32Array, dt: number, onHide: (i: number) => void, snake: Serpentine | null): number {
  let count = 0
  for (let i = 0; i < a.phase.length; i++) {
    const st = target.state[i] as number
    if (a.phase[i] === 3 || (a.phase[i] === 0 && (st === HIDDEN || st === LEAVING))) {
      onHide(i)
      continue
    }
    if (a.phase[i] === 0) {
      a.phase[i] = 1
      a.mode[i] = 0
      a.x[i] = DOOR.x
      a.z[i] = DOOR.z
      a.goalX[i] = snake && st === WAITING ? snake.entry.x : (target.tx[i] as number)
      a.goalZ[i] = snake && st === WAITING ? snake.entry.z : (target.tz[i] as number)
      a.yaw[i] = Math.atan2(1, -0.2)
    }
    if (st === LEAVING || st === HIDDEN) a.phase[i] = 2
    const toExit = a.phase[i] === 2
    const delay = !toExit && st === WAITING ? Math.min(MAX_QUEUE_DELAY, QUEUE_DELAY_PER_RANK * (target.rank[i] as number)) : 0
    if (snake && !toExit && st === WAITING) {
      stepOnSnake(a, i, dt, snake, target.rank[i] as number, delay)
      visible[count++] = i
      continue
    }
    if (a.mode[i] === 1) {
      a.mode[i] = 0
      a.goalX[i] = a.x[i] as number
      a.goalZ[i] = a.z[i] as number
      a.pending[i] = NO_PENDING
    }
    const raw = toExit ? EXIT : { x: target.tx[i] as number, z: target.tz[i] as number }
    const r = corridorRoute(a.x[i] as number, a.z[i] as number, raw.x, raw.z)
    retarget(a, i, dt, r.x, r.z, delay)
    walk(a, i, dt)
    if (toExit && Math.hypot(EXIT.x - (a.x[i] as number), EXIT.z - (a.z[i] as number)) < 0.4) {
      a.phase[i] = 3
      onHide(i)
      continue
    }
    visible[count++] = i
  }
  return count
}

/** Ortak kuyruk: önce yolun girişine yürür, sonra yol boyunca sıranın başına doğru, öndekinden sonra kalkarak ilerler. */
function stepOnSnake(a: AgentState, i: number, dt: number, snake: Serpentine, rank: number, delay: number): void {
  if (a.mode[i] === 0) {
    retarget(a, i, dt, snake.entry.x, snake.entry.z, 0)
    walk(a, i, dt)
    if (Math.hypot(snake.entry.x - (a.x[i] as number), snake.entry.z - (a.z[i] as number)) < 0.6) {
      a.mode[i] = 1
      a.pathS[i] = snake.length
      a.goalX[i] = snake.length
      a.goalZ[i] = 0
      a.pending[i] = NO_PENDING
    }
    return
  }
  retarget(a, i, dt, Math.min(rank, snake.capacity - 1) * QUEUE_GAP, 0, delay)
  followPath(a, i, dt, snake, a.goalX[i] as number)
}

function drawAgent(i: number, a: AgentState, target: ReturnType<typeof makeBuffers>, journeys: readonly Journey[], t: number, d: Object3D, m: Meshes, move: { setX: (i: number, v: number) => void }): void {
  const x = a.x[i] as number
  const z = a.z[i] as number
  const yaw = a.yaw[i] as number
  d.position.set(x, 0, z)
  d.rotation.set(0, yaw, 0)
  d.scale.setScalar(1)
  d.updateMatrix()
  m.body.setMatrixAt(i, d.matrix)
  move.setX(i, a.move[i] as number)
  d.position.set(x + Math.sin(yaw) * CART_AHEAD, 0, z + Math.cos(yaw) * CART_AHEAD)
  d.updateMatrix()
  m.cart.setMatrixAt(i, d.matrix)
  const j = journeys[i] as Journey
  const unloaded = Math.min(1, Math.max(0, ((t - j.start) / Math.max(1e-6, j.scanEnd - j.start)) * 1.3))
  d.scale.set(1, 0.02 + 0.28 * Math.min(1, j.items / 40) * (1 - unloaded), 1)
  d.position.y = 0.46
  d.updateMatrix()
  m.load.setMatrixAt(i, d.matrix)
  const waiting = target.state[i] === WAITING
  d.position.set(x, 0.012, z)
  d.rotation.set(-Math.PI / 2, 0, 0)
  d.scale.setScalar(waiting ? 1 : 0)
  d.updateMatrix()
  m.ring.setMatrixAt(i, d.matrix)
  const pressure = Math.min(1, (target.waited[i] as number) / FULL_PRESSURE_SECONDS)
  m.ring.setColorAt(i, mix.copy(calm).lerp(accent, pressure))
}

function hide(d: Object3D, i: number, m: Meshes): void {
  d.scale.setScalar(0)
  d.position.set(0, -10, 0)
  d.updateMatrix()
  for (const mesh of [m.body, m.cart, m.load, m.ring]) mesh.setMatrixAt(i, d.matrix)
}
