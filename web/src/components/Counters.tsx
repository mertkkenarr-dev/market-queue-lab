import { useEffect, useMemo } from 'react'
import { CanvasTexture, Object3D, SRGBColorSpace, type InstancedMesh } from 'three'
import { useRef } from 'react'
import { createCrowdMaterial } from '../lib/crowdMaterial'
import { attachInstanceAttributes } from '../lib/crowdState'
import { buildHumanoid } from '../lib/humanoid'
import { BELT_LENGTH, DESK_Z, laneX } from '../lib/layout'
import { STAFF_STYLE } from '../lib/people'

function numberTexture(n: number): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  if (g) {
    g.fillStyle = '#1f3d36'
    g.fillRect(0, 0, 128, 128)
    g.fillStyle = '#f0d24a'
    g.font = '700 84px Instrument Sans, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(String(n), 64, 70)
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

function Cashiers({ lanes }: { lanes: number }) {
  const ref = useRef<InstancedMesh>(null)
  const { geometry, material } = useMemo(() => {
    const geometry = buildHumanoid()
    attachInstanceAttributes(geometry, Array.from({ length: lanes }, (_, i) => STAFF_STYLE(i)), -0.75)
    return { geometry, ...createCrowdMaterial() }
  }, [lanes])
  useEffect(() => {
    const m = ref.current
    if (!m) return
    const d = new Object3D()
    for (let i = 0; i < lanes; i++) {
      d.position.set(laneX(i, lanes), 0, DESK_Z - 0.85)
      d.updateMatrix()
      m.setMatrixAt(i, d.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }, [lanes, geometry])
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])
  return <instancedMesh key={lanes} ref={ref} args={[geometry, material, lanes]} frustumCulled={false} castShadow />
}

export function Counters({ lanes }: { lanes: number }) {
  const signs = useMemo(() => Array.from({ length: lanes }, (_, i) => numberTexture(i + 1)), [lanes])
  useEffect(() => () => signs.forEach((t) => t.dispose()), [signs])
  return (
    <group>
      {Array.from({ length: lanes }, (_, i) => {
        const x = laneX(i, lanes)
        return (
          <group key={i}>
            <mesh position={[x + 0.35, 0.45, DESK_Z - 0.1]} castShadow receiveShadow>
              <boxGeometry args={[1.3, 0.9, 0.7]} />
              <meshStandardMaterial color="#e9eeec" roughness={0.5} />
            </mesh>
            <mesh position={[x + 0.5, 1.0, DESK_Z - 0.1]} castShadow>
              <boxGeometry args={[0.32, 0.22, 0.28]} />
              <meshStandardMaterial color="#2a3a35" roughness={0.4} />
            </mesh>
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
            <mesh position={[x, 3.0, DESK_Z - 0.5]} castShadow>
              <planeGeometry args={[0.7, 0.7]} />
              <meshBasicMaterial map={signs[i]} />
            </mesh>
          </group>
        )
      })}
      <Cashiers lanes={lanes} />
    </group>
  )
}
