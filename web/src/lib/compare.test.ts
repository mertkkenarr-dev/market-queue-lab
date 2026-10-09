import { describe, expect, it } from 'vitest'
import { describeComparison, type LayoutStats, type PairedComparison } from './compare'

const sum = (mean: number, lo: number, hi: number) => ({ n: 30, mean, sd: 1, se: 1, ciLow: lo, ciHigh: hi })
const stats = (m: number): LayoutStats => ({ meanWait: sum(m, m - 5, m + 5), waitP90: 1, probWait: 1, utilization: 1 })
const make = (random: ReturnType<typeof sum>, jsq: ReturnType<typeof sum>): PairedComparison => ({
  reps: 30,
  layouts: { 'separate-jsq': stats(110), 'separate-random': stats(200), pooled: stats(100) },
  vsPooled: { 'separate-random': random, 'separate-jsq': jsq },
})

describe('describeComparison', () => {
  it('credits the pooled queue against random choosers and says nothing clear against smart ones', () => {
    const t = describeComparison(make(sum(100, 90, 110), sum(2, -3, 7)))
    expect(t).toContain('rastgele kuyruk seçenlere göre ortalama beklemeyi 1 dk 40 sn')
    expect(t).toContain('en kısa kuyruğu seçenlere göre belirgin bir fark yok')
  })
  it('states a lengthening when the pooled queue is clearly worse', () => {
    expect(describeComparison(make(sum(-30, -40, -20), sum(-30, -40, -20)))).toContain('uzatıyor')
  })
  it('reports the clear gain against both when both intervals exclude zero', () => {
    const t = describeComparison(make(sum(100, 90, 110), sum(10, 5, 15)))
    expect(t.match(/kısaltıyor/g)?.length).toBe(2)
  })
})
