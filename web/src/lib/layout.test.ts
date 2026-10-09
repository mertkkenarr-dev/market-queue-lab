import { describe, expect, it } from 'vitest'
import { laneX, queueSlot, servingPosition, STORE, TOTAL_LANES, QUEUE_START_Z } from './layout'

describe('queueSlot', () => {
  it('keeps every slot inside the store for any rank, lane count and layout', () => {
    for (const pooled of [false, true]) {
      for (let lanes = 1; lanes <= TOTAL_LANES; lanes++) {
        for (let lane = 0; lane < lanes; lane++) {
          for (let rank = 0; rank <= 400; rank += 3) {
            const { x, z } = queueSlot(rank, lane, lanes, pooled)
            expect(Math.abs(x)).toBeLessThanOrEqual(STORE.halfW)
            expect(z).toBeGreaterThanOrEqual(QUEUE_START_Z)
            expect(z).toBeLessThanOrEqual(STORE.zFront)
          }
        }
      }
    }
  })

  it('places consecutive ranks at least 0.9 m apart inside one lane queue', () => {
    const a = queueSlot(0, 2, 5, false)
    const b = queueSlot(1, 2, 5, false)
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(0.9)
  })

  it('centres the pooled block on the open lanes', () => {
    const left = queueSlot(0, 0, 1, true).x
    const mid = queueSlot(0, 0, 10, true).x
    expect(left).toBeLessThan(mid)
  })
})

describe('lanes', () => {
  it('spaces the ten physical lanes evenly and left to right', () => {
    expect(laneX(1) - laneX(0)).toBeCloseTo(laneX(9) - laneX(8))
    expect(laneX(0)).toBeLessThan(laneX(9))
  })
  it('serves customers beside the belt, not on it', () => {
    expect(servingPosition(3).x).toBeLessThan(laneX(3) - 0.4)
  })
})
