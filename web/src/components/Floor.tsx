import { useEffect, useMemo } from 'react'
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import { COLORS } from '../lib/palette'
import { DESK_Z, DOOR, EXIT, STORE, laneX } from '../lib/layout'

function useTileTexture(): CanvasTexture {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')
    if (g) {
      g.fillStyle = COLORS.floor
      g.fillRect(0, 0, 128, 128)
      g.strokeStyle = COLORS.tileLine
      g.lineWidth = 3
      g.strokeRect(0, 0, 128, 128)
    }
    const t = new CanvasTexture(c)
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(STORE.halfW * 2, STORE.halfD * 2)
    t.colorSpace = SRGBColorSpace
    return t
  }, [])
  useEffect(() => () => tex.dispose(), [tex])
  return tex
}

export function Floor({ lanes }: { lanes: number }) {
  const tile = useTileTexture()
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[STORE.halfW * 2, STORE.halfD * 2]} />
        <meshLambertMaterial map={tile} />
      </mesh>
      <mesh position={[0, 0.5, -STORE.halfD - 0.05]}>
        <boxGeometry args={[STORE.halfW * 2, 1, 0.1]} />
        <meshLambertMaterial color={COLORS.wall} />
      </mesh>
      {[-5, -2.5, 0, 2.5, 5].map((x) => (
        <mesh key={x} position={[x, 0.45, -STORE.halfD + 1]}>
          <boxGeometry args={[1.8, 0.9, 0.5]} />
          <meshLambertMaterial color={COLORS.shelf} />
        </mesh>
      ))}
      {Array.from({ length: lanes }, (_, i) => (
        <mesh key={i} position={[laneX(i, lanes), 0.3, DESK_Z]}>
          <boxGeometry args={[0.9, 0.6, 0.6]} />
          <meshLambertMaterial color={COLORS.desk} />
        </mesh>
      ))}
      {[DOOR, EXIT].map((p) => (
        <mesh key={p.x} rotation-x={-Math.PI / 2} position={[p.x, 0.01, p.z + 0.5]}>
          <planeGeometry args={[1.1, 0.5]} />
          <meshBasicMaterial color={COLORS.ink} />
        </mesh>
      ))}
    </group>
  )
}
