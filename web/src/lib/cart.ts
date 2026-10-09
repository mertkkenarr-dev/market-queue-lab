import { BoxGeometry, BufferGeometry, Matrix4 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const box = (w: number, h: number, d: number, x: number, y: number, z: number): BufferGeometry =>
  new BoxGeometry(w, h, d).applyMatrix4(new Matrix4().makeTranslation(x, y, z))

/** Alışveriş arabası: tel sepet, dört ayak, itme kolu. Başlangıç noktası taban ortası; kol -z yönünde (kişiye bakar). */
export function buildCart(): BufferGeometry {
  const parts = [
    box(0.5, 0.02, 0.8, 0, 0.45, 0),
    box(0.02, 0.32, 0.8, -0.25, 0.61, 0),
    box(0.02, 0.32, 0.8, 0.25, 0.61, 0),
    box(0.5, 0.32, 0.02, 0, 0.61, 0.4),
    box(0.5, 0.2, 0.02, 0, 0.55, -0.4),
    box(0.5, 0.03, 0.03, 0, 0.98, -0.5),
    box(0.03, 0.55, 0.03, -0.25, 0.7, -0.46),
    box(0.03, 0.55, 0.03, 0.25, 0.7, -0.46),
    ...[-0.22, 0.22].flatMap((x) => [-0.35, 0.35].map((z) => box(0.035, 0.45, 0.035, x, 0.225, z))),
  ]
  const merged = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())
  return merged
}

/** Sepet içeriği: tabanı y=0'da birim kutu; ölçek y ürün sayısıyla orantılı verilir. */
export function buildLoad(): BufferGeometry {
  return box(0.44, 1, 0.72, 0, 0.5, 0)
}
