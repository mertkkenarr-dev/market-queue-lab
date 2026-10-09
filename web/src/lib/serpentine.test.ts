import { describe, expect, it } from 'vitest'
import { QUEUE_GAP, STORE } from './layout'
import { buildSerpentine, rowsNeeded, SNAKE, type Serpentine, type Tape } from './serpentine'

const distToTape = (p: { x: number; z: number }, t: Tape): number => {
  const dx = t.b.x - t.a.x
  const dz = t.b.z - t.a.z
  const len2 = dx * dx + dz * dz
  const f = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - t.a.x) * dx + (p.z - t.a.z) * dz) / len2))
  return Math.hypot(p.x - (t.a.x + dx * f), p.z - (t.a.z + dz * f))
}

const slots = (s: Serpentine) => Array.from({ length: s.capacity }, (_, r) => s.at(r * QUEUE_GAP))

describe('serpentine', () => {
  const cases = [-7.8, -3, 0, 4, 7.8].flatMap((cx) => [2, 3, 5, 8].map((rows) => [cx, rows] as const))
  it.each(cases)('keeps every queue slot inside the store and clear of the tapes (centre %f, rows %i)', (cx, rows) => {
    const s = buildSerpentine(cx, rows)
    for (const p of slots(s)) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(STORE.halfW)
      expect(p.z).toBeLessThanOrEqual(STORE.zFront)
      for (const t of s.tapes) expect(distToTape(p, t)).toBeGreaterThanOrEqual(0.4)
    }
  })

  it('starts the queue at the head and spaces consecutive people by the queue gap along the path', () => {
    const s = buildSerpentine(0)
    expect(s.at(0).x).toBeCloseTo(0)
    const a = s.at(2 * QUEUE_GAP)
    const b = s.at(3 * QUEUE_GAP)
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeCloseTo(QUEUE_GAP, 5)
  })

  it('never lets two neighbours stand closer than the separation radius, even at corners', () => {
    const s = buildSerpentine(0)
    const ps = slots(s)
    for (let i = 1; i < ps.length; i++) {
      const a = ps[i - 1] as { x: number; z: number }
      const b = ps[i] as { x: number; z: number }
      expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(0.6)
    }
  })

  it('clamps beyond the end of the path', () => {
    const s = buildSerpentine(0)
    expect(s.at(s.length + 50)).toEqual(s.at(s.length))
  })

  it('has an entry just outside the tail end and inside the store, for every row count', () => {
    for (const cx of [-7.8, 0, 7.8]) for (let rows = SNAKE.minRows; rows <= SNAKE.maxRows; rows++) {
      const s = buildSerpentine(cx, rows)
      expect(Math.abs(s.entry.x)).toBeLessThan(STORE.halfW)
      expect(s.entry.z).toBeLessThanOrEqual(STORE.zFront)
    }
  })

  it('faces the head: yaw points toward decreasing path distance', () => {
    const s = buildSerpentine(0)
    const mid = s.at(1.0 * QUEUE_GAP * 2)
    expect(Math.sin(mid.yaw)).toBeLessThan(0)
  })
})

describe('rowsNeeded', () => {
  it('grows monotonically with the number of people and stays within bounds', () => {
    let prev = 0
    for (let n = 0; n <= 80; n++) {
      const r = rowsNeeded(n)
      expect(r).toBeGreaterThanOrEqual(prev)
      expect(r).toBeGreaterThanOrEqual(SNAKE.minRows)
      expect(r).toBeLessThanOrEqual(SNAKE.maxRows)
      prev = r
    }
  })
  it('provides enough slots for the people it was asked for, until the maximum', () => {
    for (const n of [3, 8, 15, 30]) expect(buildSerpentine(0, rowsNeeded(n)).capacity).toBeGreaterThanOrEqual(n)
  })
  it('opens the gate on the tail side so the entry is not walled in', () => {
    for (let rows = SNAKE.minRows; rows <= SNAKE.maxRows; rows++) {
      const s = buildSerpentine(0, rows)
      for (const t of s.tapes) expect(distToTape(s.entry, t)).toBeGreaterThan(0.5)
    }
  })
})
