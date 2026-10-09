import { describe, expect, it } from 'vitest'
import { describeComparison, type PairedComparison } from './compare'

const sum = (mean: number, lo: number, hi: number) => ({ n: 30, mean, sd: 1, se: 1, ciLow: lo, ciHigh: hi })
const base = { waitP90: 1, probWait: 1, utilization: 1 }
const make = (diff: ReturnType<typeof sum>): PairedComparison => ({
  reps: 30,
  separate: { meanWait: sum(100, 90, 110), ...base },
  pooled: { meanWait: sum(100 - diff.mean, 80, 90), ...base },
  diff,
})

describe('describeComparison', () => {
  it('says there is no clear difference when the interval covers zero', () => {
    expect(describeComparison(make(sum(2, -3, 7)))).toContain('belirgin bir')
  })
  it('credits the pooled queue when the paired difference is positive and clear', () => {
    expect(describeComparison(make(sum(30, 20, 40)))).toContain('ortak kuyruk')
  })
  it('credits separate queues when the difference is clearly negative', () => {
    expect(describeComparison(make(sum(-30, -40, -20)))).toContain('ayrı kuyruklar')
  })
})
