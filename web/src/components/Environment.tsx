import { useEffect, useMemo, useRef } from 'react'
import { CanvasTexture, Color, Object3D, RepeatWrapping, SRGBColorSpace, type InstancedMesh } from 'three'
import { DOOR, EXIT, STORE, STORE_CENTER_Z, STORE_DEPTH } from '../lib/layout'
import { COLORS } from '../lib/palette'
import { mulberry32 } from '../lib/prng'

const PRODUCT_TONES = ['#c8553d', '#e0b84c', '#4f8a5b', '#2f6f8f', '#d8d2c4', '#b5486a', '#8a9a3d', '#e08f4a', '#6b7fb0']
const LEVELS = [0.35, 0.8, 1.25, 1.7]

function useTile(): CanvasTexture {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')
    if (g) {
      g.fillStyle = COLORS.floor
      g.fillRect(0, 0, 256, 256)
      const rand = mulberry32(5)
      for (let i = 0; i < 1400; i++) {
        g.fillStyle = `rgba(${rand() > 0.5 ? '255,255,255' : '60,90,80'},${0.02 + rand() * 0.035})`
        g.fillRect(rand() * 256, rand() * 256, 2 + rand() * 6, 2 + rand() * 6)
      }
      g.strokeStyle = COLORS.tileLine
      g.lineWidth = 3
      g.strokeRect(0, 0, 256, 256)
    }
    const t = new CanvasTexture(c)
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(STORE.halfW * 2 / 1.2, STORE_DEPTH / 1.2)
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [])
  useEffect(() => () => tex.dispose(), [tex])
  return tex
}

interface Rack { x: number; z: number; length: number; turned: boolean }
const RACKS: Rack[] = [
  { x: 0, z: STORE.zBack + 0.6, length: 20, turned: false },
  { x: -10.3, z: 3.5, length: 19, turned: true },
  { x: 10.3, z: 3.5, length: 19, turned: true },
]

function Products() {
  const ref = useRef<InstancedMesh>(null)
  const items = useMemo(() => {
    const rand = mulberry32(11)
    const out: { x: number; y: number; z: number; w: number; h: number; c: string; turned: boolean }[] = []
    for (const r of RACKS) {
      for (const y of LEVELS) {
        for (let s = -r.length / 2 + 0.2; s < r.length / 2 - 0.3; ) {
          const w = 0.22 + rand() * 0.16
          const along = s + w / 2
          out.push({ x: r.turned ? r.x : r.x + along, y, z: r.turned ? r.z + along : r.z, w, h: 0.22 + rand() * 0.2, c: PRODUCT_TONES[Math.floor(rand() * PRODUCT_TONES.length)] as string, turned: r.turned })
          s += w + 0.03
        }
      }
    }
    return out
  }, [])
  useEffect(() => {
    const m = ref.current
    if (!m) return
    const d = new Object3D()
    const col = new Color()
    items.forEach((p, i) => {
      d.position.set(p.x, p.y + p.h / 2, p.z)
      d.scale.set(p.turned ? 0.38 : p.w, p.h, p.turned ? p.w : 0.38)
      d.updateMatrix()
      m.setMatrixAt(i, d.matrix)
      m.setColorAt(i, col.set(p.c))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [items])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow>
      <boxGeometry />
      <meshStandardMaterial roughness={0.6} />
    </instancedMesh>
  )
}

export function Environment() {
  const tile = useTile()
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, STORE_CENTER_Z]} receiveShadow>
        <planeGeometry args={[STORE.halfW * 2, STORE_DEPTH]} />
        <meshStandardMaterial map={tile} roughness={0.38} metalness={0.05} />
      </mesh>
      <mesh position={[0, 1.6, STORE.zBack - 0.1]} receiveShadow>
        <boxGeometry args={[STORE.halfW * 2 + 0.4, 3.2, 0.2]} />
        <meshStandardMaterial color={COLORS.wall} roughness={0.9} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (STORE.halfW + 0.1), 1.6, STORE_CENTER_Z]} receiveShadow>
          <boxGeometry args={[0.2, 3.2, STORE_DEPTH]} />
          <meshStandardMaterial color={COLORS.wall} roughness={0.9} />
        </mesh>
      ))}
      {RACKS.map((r) => (
        <group key={`${r.x}${r.z}`}>
          <mesh position={[r.x, 1, r.z]} castShadow receiveShadow>
            <boxGeometry args={r.turned ? [0.5, 2, r.length] : [r.length, 2, 0.5]} />
            <meshStandardMaterial color="#6f837b" roughness={0.7} />
          </mesh>
        </group>
      ))}
      <Products />
      {[DOOR, EXIT].map((p, i) => (
        <group key={i} position={[p.x, 0, STORE.zFront - 0.15]}>
          <mesh position={[0, 0.006, -0.5]} rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[2.2, 1.6]} />
            <meshStandardMaterial color="#2a3a35" roughness={1} />
          </mesh>
          {[-1.15, 1.15].map((dx) => (
            <mesh key={dx} position={[dx, 1.2, 0]} castShadow>
              <boxGeometry args={[0.1, 2.4, 0.1]} />
              <meshStandardMaterial color="#44574f" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
