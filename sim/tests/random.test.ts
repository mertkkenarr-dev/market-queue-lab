import { describe, expect, it } from 'vitest'
import { Random, toCdf } from '../src/random'
import { MinHeap, Fifo } from '../src/heap'
import { summarize } from '../src/stats'

describe('Random', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    const a = new Random(7)
    const b = new Random(7)
    const c = new Random(8)
    const seqA = Array.from({ length: 5 }, () => a.uniform())
    expect(Array.from({ length: 5 }, () => b.uniform())).toEqual(seqA)
    expect(Array.from({ length: 5 }, () => c.uniform())).not.toEqual(seqA)
  })

  it('uniform stays in [0,1) with mean ~0.5', () => {
    const r = new Random(1)
    const xs = Array.from({ length: 200_000 }, () => r.uniform())
    expect(xs.reduce((m, v) => Math.min(m, v), 1)).toBeGreaterThanOrEqual(0)
    expect(xs.reduce((m, v) => Math.max(m, v), 0)).toBeLessThan(1)
    expect(summarize(xs).mean).toBeCloseTo(0.5, 2)
  })

  it('exponential has mean 1/rate and sd 1/rate', () => {
    const r = new Random(2)
    const s = summarize(Array.from({ length: 200_000 }, () => r.exponential(2)))
    expect(s.mean).toBeCloseTo(0.5, 2)
    expect(s.sd).toBeCloseTo(0.5, 2)
  })

  it('normal has mean 0 and sd 1', () => {
    const r = new Random(3)
    const s = summarize(Array.from({ length: 200_000 }, () => r.normal()))
    expect(s.mean).toBeCloseTo(0, 1)
    expect(s.sd).toBeCloseTo(1, 1)
  })

  it('lognormalFromMoments reproduces the requested mean and variance', () => {
    const r = new Random(4)
    const s = summarize(Array.from({ length: 400_000 }, () => r.lognormalFromMoments(60, 900)))
    expect(s.mean).toBeCloseTo(60, 0)
    expect(s.sd).toBeCloseTo(30, 0)
  })

  it('discrete samples proportionally to the pmf', () => {
    const r = new Random(5)
    const cdf = toCdf([1, 2, 7])
    const counts = [0, 0, 0]
    for (let i = 0; i < 100_000; i++) counts[r.discrete(cdf)]!++
    expect(counts[0]! / 100_000).toBeCloseTo(0.1, 1)
    expect(counts[2]! / 100_000).toBeCloseTo(0.7, 1)
  })
})

describe('MinHeap / Fifo', () => {
  it('pops in sorted order', () => {
    const h = new MinHeap<number>((a, b) => a < b)
    const r = new Random(9)
    const xs = Array.from({ length: 1000 }, () => r.uniform())
    xs.forEach((x) => h.push(x))
    const out: number[] = []
    while (h.size) out.push(h.pop() as number)
    expect(out).toEqual([...xs].sort((a, b) => a - b))
  })

  it('Fifo preserves order across compaction', () => {
    const q = new Fifo<number>()
    for (let i = 0; i < 5000; i++) q.push(i)
    for (let i = 0; i < 3000; i++) expect(q.shift()).toBe(i)
    expect(q.length).toBe(2000)
    expect(q.shift()).toBe(3000)
  })
})
