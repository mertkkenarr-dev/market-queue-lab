import { describe, expect, it } from 'vitest'
import type { Journey } from '../types/scenario'
import { frameAt, HIDDEN, LEAVING, makeBuffers, SERVING, WAITING } from './replay'

const journeys: Journey[] = [
  { arrival: 0, start: 0, end: 10, lane: 0, items: 5 },
  { arrival: 1, start: 10, end: 20, lane: 0, items: 5 },
  { arrival: 2, start: 10, end: 15, lane: 1, items: 5 },
]

describe('frameAt', () => {
  it('hides customers who have not arrived', () => {
    const b = makeBuffers(3)
    const s = frameAt(journeys, 0.5, 'separate-jsq', 2, b)
    expect([...b.state]).toEqual([SERVING, HIDDEN, HIDDEN])
    expect(s.serving).toBe(1)
  })

  it('ranks waiting customers per lane in separate queues', () => {
    const b = makeBuffers(3)
    const s = frameAt(journeys, 5, 'separate-jsq', 2, b)
    expect([...b.state]).toEqual([SERVING, WAITING, WAITING])
    expect(s.waiting).toBe(2)
    expect(b.tx[1]).not.toBe(b.tx[2])
  })

  it('numbers pooled waiters in one shared line', () => {
    const b = makeBuffers(3)
    frameAt(journeys, 5, 'pooled', 2, b)
    expect([b.rank[1], b.rank[2]]).toEqual([0, 1])
  })

  it('walks finished customers to the exit then hides them', () => {
    const b = makeBuffers(3)
    frameAt(journeys, 11, 'separate-jsq', 2, b)
    expect(b.state[0]).toBe(LEAVING)
    frameAt(journeys, 100, 'separate-jsq', 2, b)
    expect([...b.state]).toEqual([HIDDEN, HIDDEN, HIDDEN])
  })

  it('marks which lanes are serving', () => {
    const b = makeBuffers(3)
    const s = frameAt(journeys, 5, 'separate-jsq', 2, b)
    expect([...s.laneServing]).toEqual([1, 0])
  })

  it('reports mean wait only over customers who started service', () => {
    const b = makeBuffers(3)
    const s = frameAt(journeys, 12, 'separate-jsq', 2, b)
    expect(s.meanWaitStarted).toBeCloseTo((0 + 9 + 8) / 3)
  })
})
