import { describe, expect, it } from 'vitest'
import type { Journey } from '../types/scenario'
import { waitingSeries } from './series'

const js: Journey[] = [
  { arrival: 0, start: 0, end: 10, lane: 0, items: 1 },
  { arrival: 5, start: 10, end: 20, lane: 0, items: 1 },
  { arrival: 6, start: 20, end: 30, lane: 0, items: 1 },
]

describe('waitingSeries', () => {
  it('counts customers between arrival and start of service', () => {
    const s = waitingSeries(js, 30, 5)
    expect([...s.waiting]).toEqual([0, 1, 1, 1, 0, 0, 0])
    expect(s.peak).toBe(1)
  })

  it('reports a peak of 2 when two customers wait at the same time', () => {
    const two: Journey[] = [
      { arrival: 0, start: 0, end: 30, lane: 0, items: 1 },
      { arrival: 1, start: 30, end: 40, lane: 0, items: 1 },
      { arrival: 2, start: 40, end: 50, lane: 0, items: 1 },
    ]
    expect(waitingSeries(two, 60, 5).peak).toBe(2)
  })

  it('is zero before anyone arrives and after everyone started', () => {
    const s = waitingSeries(js, 60, 10)
    expect(s.waiting[0]).toBe(0)
    expect(s.waiting[s.waiting.length - 1]).toBe(0)
  })
})
