import { BoxGeometry, BufferGeometry, CapsuleGeometry, CylinderGeometry, Float32BufferAttribute, Matrix4, SphereGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const PART = { body: 0, legL: 1, legR: 2, armL: 3, armR: 4 } as const
export const ZONE = { skin: 0, shirt: 1, pants: 2, dark: 3, hair: 4 } as const
export const HIP_Y = 0.9
export const SHOULDER_Y = 1.46

type Part = (typeof PART)[keyof typeof PART]
type Zone = (typeof ZONE)[keyof typeof ZONE]

function piece(g: BufferGeometry, part: Part, zone: Zone, at: [number, number, number], scale: [number, number, number] = [1, 1, 1]): BufferGeometry {
  g.applyMatrix4(new Matrix4().makeScale(...scale).setPosition(...at))
  const n = g.getAttribute('position').count
  g.setAttribute('aPart', new Float32BufferAttribute(new Float32Array(n).fill(part), 1))
  g.setAttribute('aZone', new Float32BufferAttribute(new Float32Array(n).fill(zone), 1))
  return g
}

/**
 * 1,75 m, ~800 üçgen. Kollar ve bacaklar ayrı parça kimliği taşır: yürüme salınımı
 * vertex shader'da bu kimliğe göre kalça/omuz ekseninde döndürülür (iskelet gerekmez).
 */
export function buildHumanoid(): BufferGeometry {
  const parts: BufferGeometry[] = [
    piece(new CapsuleGeometry(0.16, 0.36, 4, 10), PART.body, ZONE.shirt, [0, 1.2, 0], [1.2, 1, 0.68]),
    piece(new BoxGeometry(0.36, 0.17, 0.21), PART.body, ZONE.pants, [0, 0.93, 0]),
    piece(new CylinderGeometry(0.05, 0.055, 0.1, 8), PART.body, ZONE.skin, [0, 1.5, 0]),
    piece(new SphereGeometry(0.105, 14, 10), PART.body, ZONE.skin, [0, 1.62, 0.005], [0.95, 1.12, 1]),
    piece(new SphereGeometry(0.113, 14, 10, 0, Math.PI * 2, 0, 1.75), PART.body, ZONE.hair, [0, 1.635, -0.012], [0.97, 1.1, 1.03]),
  ]
  for (const side of [-1, 1] as const) {
    const leg = side < 0 ? PART.legL : PART.legR
    const arm = side < 0 ? PART.armL : PART.armR
    parts.push(
      piece(new CylinderGeometry(0.085, 0.062, 0.8, 8), leg, ZONE.pants, [side * 0.095, 0.5, 0]),
      piece(new BoxGeometry(0.115, 0.075, 0.27), leg, ZONE.dark, [side * 0.095, 0.045, 0.055]),
      piece(new CylinderGeometry(0.052, 0.046, 0.3, 8), arm, ZONE.shirt, [side * 0.235, SHOULDER_Y - 0.15, 0]),
      piece(new CylinderGeometry(0.043, 0.036, 0.27, 8), arm, ZONE.skin, [side * 0.235, SHOULDER_Y - 0.435, 0]),
      piece(new SphereGeometry(0.042, 8, 6), arm, ZONE.skin, [side * 0.235, SHOULDER_Y - 0.59, 0]),
    )
  }
  const merged = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())
  return merged
}
