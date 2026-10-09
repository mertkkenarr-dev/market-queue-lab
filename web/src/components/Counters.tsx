import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CanvasTexture, Object3D, SRGBColorSpace, type InstancedBufferAttribute, type InstancedMesh, type MeshBasicMaterial } from 'three'
import { createCrowdMaterial } from '../lib/crowdMaterial'
import { attachInstanceAttributes } from '../lib/crowdState'
import { buildHumanoid } from '../lib/humanoid'
import { BELT_LENGTH, DESK_Z, laneX, TOTAL_LANES } from '../lib/layout'
import { STAFF_STYLE } from '../lib/people'
import type { ReplayStats } from '../types/scenario'

type StatsRef = { current: ReplayStats }

function numberTexture(n: number, open: boolean): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  if (g) {
    g.fillStyle = open ? '#1f3d36' : '#9aa6a1'
    g.fillRect(0, 0, 128, 128)
    g.fillStyle = open ? '#f0d24a' : '#e4ebe8'
    g.font = '700 84px Instrument Sans, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(open ? String(n) : '×', 64, 70)
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

function Cashiers({ lanes, statsRef }: { lanes: number; statsRef: StatsRef }) {
  const ref = useRef<InstancedMesh>(null)
  const { geometry, material, uTime, work } = useMemo(() => {
    const geometry = buildHumanoid()
    const { work } = attachInstanceAttributes(geometry, Array.from({ length: lanes }, (_, i) => STAFF_STYLE(i)), -0.75)
    return { geometry, work, ...createCrowdMaterial() }
  }, [lanes])
  useFrame((_, dt) => {
    uTime.value += Math.min(dt, 0.1)
    const serving = statsRef.current.laneServing
    const attr = work as InstancedBufferAttribute
    for (let i = 0; i < lanes; i++) attr.setW(i, serving[i] ? 1 : 0.08)
    attr.needsUpdate = true
  })
  useEffect(() => {
    const m = ref.current
    if (!m) return
    const d = new Object3D()
    for (let i = 0; i < lanes; i++) {
      d.position.set(laneX(i), 0, DESK_Z - 0.85)
      d.updateMatrix()
      m.setMatrixAt(i, d.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }, [lanes, geometry])
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])
  return <instancedMesh key={lanes} ref={ref} args={[geometry, material, lanes]} frustumCulled={false} castShadow />
}

export function Counters({ lanes, statsRef }: { lanes: number; statsRef: StatsRef }) {
  const lamps = useRef<(MeshBasicMaterial | null)[]>([])
  const signs = useMemo(() => Array.from({ length: TOTAL_LANES }, (_, i) => numberTexture(i + 1, i < lanes)), [lanes])
  useEffect(() => () => signs.forEach((t) => t.dispose()), [signs])
  useFrame(() => {
    const serving = statsRef.current.laneServing
    for (let i = 0; i < lanes; i++) lamps.current[i]?.color.set(serving[i] ? '#7fe0a0' : '#5d6b66')
  })
  return (
    <group>
      {Array.from({ length: TOTAL_LANES }, (_, i) => {
        const x = laneX(i)
        const open = i < lanes
        return (
          <group key={i}>
            <mesh position={[x + 0.35, 0.45, DESK_Z - 0.1]} castShadow receiveShadow>
              <boxGeometry args={[1.3, 0.9, 0.7]} />
              <meshStandardMaterial color={open ? '#e9eeec' : '#bcc6c2'} roughness={0.5} />
            </mesh>
            {open && (
              <mesh position={[x + 0.5, 1.0, DESK_Z - 0.1]} castShadow>
                <boxGeometry args={[0.32, 0.22, 0.28]} />
                <meshStandardMaterial color="#2a3a35" roughness={0.4} />
              </mesh>
            )}
            <mesh position={[x, 0.42, DESK_Z + 0.3 + BELT_LENGTH / 2]} castShadow receiveShadow>
              <boxGeometry args={[0.62, 0.84, BELT_LENGTH]} />
              <meshStandardMaterial color="#8c9a95" metalness={0.4} roughness={0.5} />
            </mesh>
            <mesh position={[x, 0.855, DESK_Z + 0.3 + BELT_LENGTH / 2]}>
              <boxGeometry args={[0.52, 0.02, BELT_LENGTH - 0.08]} />
              <meshStandardMaterial color="#1c2220" roughness={0.9} />
            </mesh>
            <mesh position={[x, 2.45, DESK_Z - 0.5]}>
              <boxGeometry args={[0.04, 1.6, 0.04]} />
              <meshStandardMaterial color="#44574f" />
            </mesh>
            {open && (
              <mesh position={[x, 3.45, DESK_Z - 0.5]}>
                <sphereGeometry args={[0.09, 12, 8]} />
                <meshBasicMaterial ref={(m) => { lamps.current[i] = m }} color="#5d6b66" />
              </mesh>
            )}
            <mesh position={[x, 3.0, DESK_Z - 0.5]} castShadow>
              <planeGeometry args={[0.7, 0.7]} />
              <meshBasicMaterial map={signs[i]} />
            </mesh>
          </group>
        )
      })}
      <Cashiers lanes={lanes} statsRef={statsRef} />
    </group>
  )
}
