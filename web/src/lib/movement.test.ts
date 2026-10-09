import { describe, expect, it } from 'vitest'
import { makeAgentState, MAX_SPEED, retarget, separate, walk, SEPARATION_RADIUS } from './movement'

describe('retarget', () => {
  it('waits for the delay before adopting a new goal', () => {
    const a = makeAgentState(1)
    retarget(a, 0, 0.1, 5, 0, 0.5)
    expect(a.goalX[0]).toBe(0)
    retarget(a, 0, 0.5, 5, 0, 0.5)
    expect(a.goalX[0]).toBe(5)
  })

  it('adopts immediately when the delay is zero', () => {
    const a = makeAgentState(1)
    retarget(a, 0, 0.016, 3, 4, 0)
    expect([a.goalX[0], a.goalZ[0]]).toEqual([3, 4])
  })

  it('cancels a pending change when the desired goal returns to the current one', () => {
    const a = makeAgentState(1)
    retarget(a, 0, 0.1, 5, 0, 1)
    retarget(a, 0, 0.1, 0, 0, 1)
    retarget(a, 0, 5, 0, 0, 1)
    expect(a.goalX[0]).toBe(0)
  })
})

describe('walk', () => {
  it('never exceeds the maximum walking speed', () => {
    const a = makeAgentState(1)
    a.goalX[0] = 100
    for (let k = 0; k < 10; k++) walk(a, 0, 0.1)
    expect(a.x[0]).toBeLessThanOrEqual(MAX_SPEED * 1.0 + 1e-3)
    expect(a.x[0]).toBeGreaterThan(0)
  })

  it('stops at the goal and reports not walking', () => {
    const a = makeAgentState(1)
    a.goalX[0] = 0.02
    expect(walk(a, 0, 0.1)).toBe(false)
  })
})

describe('separate', () => {
  it('pushes overlapping agents apart without moving distant ones', () => {
    const a = makeAgentState(3)
    a.x.set([0, 0.2, 5])
    const vis = Int32Array.from([0, 1, 2])
    for (let k = 0; k < 30; k++) separate(a, vis, 3, 0.1)
    expect(Math.abs((a.x[1] as number) - (a.x[0] as number))).toBeGreaterThanOrEqual(SEPARATION_RADIUS - 0.02)
    expect(a.x[2]).toBe(5)
  })

  it('handles two agents at the exact same point', () => {
    const a = makeAgentState(2)
    separate(a, Int32Array.from([0, 1]), 2, 0.1)
    expect(Number.isFinite(a.x[0] as number)).toBe(true)
    expect(a.x[0]).not.toBe(a.x[1])
  })
})
