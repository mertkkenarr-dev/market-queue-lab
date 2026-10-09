import { describe, expect, it } from 'vitest'
import { laneX, queueSlot, servingPosition, STORE, TOTAL_LANES, QUEUE_START_Z } from './layout'

describe('queueSlot', () => {
  it('keeps every slot inside the store for any rank and lane', () => {
    for (let lane = 0; lane < TOTAL_LANES; lane++) {
      for (let rank = 0; rank <= 400; rank += 3) {
        const { x, z } = queueSlot(rank, lane)
        expect(Math.abs(x)).toBeLessThanOrEqual(STORE.halfW)
        expect(z).toBeGreaterThanOrEqual(QUEUE_START_Z)
        expect(z).toBeLessThanOrEqual(STORE.zFront)
      }
    }
  })

  it('places consecutive ranks at least 0.9 m apart inside one lane queue', () => {
    const a = queueSlot(0, 2)
    const b = queueSlot(1, 2)
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(0.9)
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
