import { describe, expect, it } from 'vitest'
import { buildSerpentine } from './serpentine'
import { corridorRoute, COUNTER_FRONT_Z, followPath, makeAgentState, MAX_SPEED, retarget, separate, walk, SEPARATION_RADIUS } from './movement'

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

describe('followPath', () => {
  const snake = buildSerpentine(0, 4)

  it('moves along the path toward the head without exceeding walking speed', () => {
    const a = makeAgentState(1)
    a.pathS[0] = snake.length
    followPath(a, 0, 0.1, snake, 0)
    expect(snake.length - (a.pathS[0] as number)).toBeLessThanOrEqual(MAX_SPEED * 0.1 + 1e-6)
    expect(a.pathS[0]).toBeLessThan(snake.length)
  })

  it('derives the position from the path and never overshoots the goal', () => {
    const a = makeAgentState(1)
    a.pathS[0] = 3
    for (let k = 0; k < 200; k++) followPath(a, 0, 0.05, snake, 2)
    expect(a.pathS[0]).toBeCloseTo(2, 1)
    const p = snake.at(a.pathS[0] as number)
    expect(a.x[0]).toBeCloseTo(p.x, 4)
    expect(a.z[0]).toBeCloseTo(p.z, 4)
  })
})

describe('corridorRoute', () => {
  it('aligns with the lane before entering the counter zone', () => {
    const r = corridorRoute(5, 2, -3, -1.9)
    expect(r.x).toBe(-3)
    expect(r.z).toBeGreaterThan(COUNTER_FRONT_Z)
  })
  it('leaves the lane straight out before heading across the store', () => {
    const r = corridorRoute(-3, -1.9, 9, 12)
    expect(r.x).toBe(-3)
    expect(r.z).toBeGreaterThan(COUNTER_FRONT_Z)
  })
  it('goes directly when already aligned or fully on one side', () => {
    expect(corridorRoute(-3, 2, -3, -1.9)).toEqual({ x: -3, z: -1.9 })
    expect(corridorRoute(0, 4, 8, 9)).toEqual({ x: 8, z: 9 })
  })
})
