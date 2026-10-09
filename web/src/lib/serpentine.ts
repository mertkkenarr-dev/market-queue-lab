import { SNAKE, STORE } from '@sim/geometry'
import { QUEUE_GAP } from './layout'

export { SNAKE }

export interface Pt {
  x: number
  z: number
}
export interface Tape {
  a: Pt
  b: Pt
}

/** Kıvrımlı kuyruk yolu: konumlar, şeritler ve direkler aynı geometriden çıkar, tutarsız olamazlar. */
export interface Serpentine {
  length: number
  /** Yoldaki en son yuva sırası (sonrası son yuvada yığılır). */
  capacity: number
  /** Yolun kuyruk ucunun hemen dışı: müşteriler kapıdan buraya yürür, sonra yola girer. */
  entry: Pt
  tapes: readonly Tape[]
  posts: readonly Pt[]
  /** s metre uzaklıktaki nokta ve başa doğru bakış açısı (yaw). s=0 sıranın başıdır. */
  at(s: number): { x: number; z: number; yaw: number }
}

const pathLength = (rows: number): number => SNAKE.rowWidth / 2 + (rows - 1) * (SNAKE.rowSpacing + SNAKE.rowWidth)

/** En az bu kadar kişiyi alan en küçük satır sayısı. Kuyruk uzadıkça yol uzar; kısa kuyrukta kısa yol, kısa yürüyüş. */
export function rowsNeeded(people: number): number {
  for (let r = SNAKE.minRows; r < SNAKE.maxRows; r++) if (Math.floor(pathLength(r) / QUEUE_GAP) + 1 >= people) return r
  return SNAKE.maxRows
}

const cache = new Map<number, Serpentine>()

/**
 * Sıranın başı satır 0'ın ortasında; yol önce sağa, sonra satır satır S çizerek geriye döner.
 * Merkez, yolun giriş ağzı ve duvarlar sığacak biçimde sıkıştırılır.
 */
export function buildSerpentine(centerX: number, rowsRaw: number = SNAKE.maxRows): Serpentine {
  const rows = Math.min(SNAKE.maxRows, Math.max(SNAKE.minRows, Math.round(rowsRaw)))
  const half = SNAKE.rowWidth / 2
  const minC = -STORE.halfW + 0.8 + half + SNAKE.gate
  const cx = Math.min(STORE.halfW - 0.8 - half - SNAKE.gate, Math.max(minC, centerX))
  const key = Math.round(cx * 100) * 16 + rows
  const hit = cache.get(key)
  if (hit) return hit

  const z = (k: number): number => SNAKE.firstRowZ + k * SNAKE.rowSpacing
  const pts: Pt[] = [{ x: cx, z: z(0) }]
  for (let k = 0; k < rows; k++) {
    const toRight = k % 2 === 0
    pts.push({ x: toRight ? cx + half : cx - half, z: z(k) })
    if (k < rows - 1) pts.push({ x: toRight ? cx + half : cx - half, z: z(k + 1) })
  }
  const cum = [0]
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1] as Pt
    const q = pts[i] as Pt
    cum.push((cum[i - 1] as number) + Math.hypot(q.x - p.x, q.z - p.z))
  }
  const length = cum[cum.length - 1] as number

  const at = (sRaw: number) => {
    const s = Math.min(length, Math.max(0, sRaw))
    let i = 1
    while (i < cum.length - 1 && (cum[i] as number) < s) i++
    const p = pts[i - 1] as Pt
    const q = pts[i] as Pt
    const seg = (cum[i] as number) - (cum[i - 1] as number)
    const f = seg === 0 ? 0 : (s - (cum[i - 1] as number)) / seg
    return { x: p.x + (q.x - p.x) * f, z: p.z + (q.z - p.z) * f, yaw: Math.atan2(p.x - q.x, p.z - q.z) }
  }

  const pad = SNAKE.sidePad
  const zTop = z(0) - SNAKE.rowSpacing / 2
  const zBot = z(rows - 1) + SNAKE.rowSpacing / 2
  const tapes: Tape[] = []
  for (let k = 0; k < rows - 1; k++) {
    const zs = z(k) + SNAKE.rowSpacing / 2
    const gateRight = k % 2 === 0
    tapes.push({ a: { x: gateRight ? cx - half - pad : cx - half + SNAKE.gate, z: zs }, b: { x: gateRight ? cx + half - SNAKE.gate : cx + half + pad, z: zs } })
  }
  tapes.push({ a: { x: cx - half - pad, z: zBot }, b: { x: cx + half + pad, z: zBot } })
  tapes.push({ a: { x: cx - half - pad, z: zTop }, b: { x: cx - SNAKE.gate / 2, z: zTop } })
  tapes.push({ a: { x: cx + SNAKE.gate / 2, z: zTop }, b: { x: cx + half + pad, z: zTop } })
  tapes.push({ a: { x: cx - SNAKE.gate / 2, z: zTop }, b: { x: cx - SNAKE.gate / 2, z: z(0) + SNAKE.rowSpacing / 2 } })
  const lastToRight = (rows - 1) % 2 === 0
  const lastRowTop = z(rows - 1) - SNAKE.rowSpacing / 2
  // Yolun kuyruk ucundaki yan şerit açık bırakılır: müşteri buradan girer.
  tapes.push({ a: { x: cx + half + pad, z: zTop }, b: { x: cx + half + pad, z: lastToRight ? lastRowTop - 0.2 : zBot } })
  tapes.push({ a: { x: cx - half - pad, z: zTop }, b: { x: cx - half - pad, z: lastToRight ? zBot : lastRowTop - 0.2 } })

  const posts = new Map<string, Pt>()
  for (const t of tapes) {
    const n = Math.max(1, Math.ceil(Math.hypot(t.b.x - t.a.x, t.b.z - t.a.z) / 3))
    for (let i = 0; i <= n; i++) {
      const p = { x: t.a.x + ((t.b.x - t.a.x) * i) / n, z: t.a.z + ((t.b.z - t.a.z) * i) / n }
      posts.set(`${Math.round(p.x * 10)},${Math.round(p.z * 10)}`, p)
    }
  }

  const entry = { x: (pts[pts.length - 1] as Pt).x + (lastToRight ? 1 : -1) * 1.0, z: z(rows - 1) }
  const built: Serpentine = { length, capacity: Math.floor(length / QUEUE_GAP) + 1, entry, tapes, posts: [...posts.values()], at }
  cache.set(key, built)
  return built
}
