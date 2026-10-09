import { describe, expect, it } from 'vitest'
import model from '../data/surrogate.json'
import parity from '../data/surrogate_parity.json'
import { parseSurrogate, predict } from './surrogate'

const m = parseSurrogate(model)

describe('surrogate evaluator', () => {
  it('matches the Python (scikit-learn) predictions on held-out scenarios', () => {
    let worst = 0
    for (const row of parity as { x: number[]; y: { wait_mean: number; wait_p90: number; p_wait: number } }[]) {
      const [lanes, pooled, rho, meanOccupancy] = row.x as [number, number, number, number]
      const p = predict(m, { lanes, pooled: pooled === 1, rho, meanOccupancy })
      for (const [got, want] of [[p.meanWait, row.y.wait_mean], [p.waitP90, row.y.wait_p90], [p.probWait, row.y.p_wait]] as const) {
        worst = Math.max(worst, Math.abs(got - want) / Math.max(1, Math.abs(want)))
      }
    }
    expect(worst).toBeLessThan(2e-3)
  })

  it('is monotone: more lanes never increase the predicted P90 at a fixed arrival rate', () => {
    const lam = 260
    const es = 62
    let prev = Infinity
    for (let c = 4; c <= 10; c++) {
      const p = predict(m, { lanes: c, pooled: false, rho: (lam * es) / 3600 / c, meanOccupancy: es }).waitP90
      expect(p).toBeLessThanOrEqual(prev + 1e-6)
      prev = p
    }
  })

  it('rejects a malformed model file', () => {
    expect(() => parseSurrogate({ features: [], targets: {} })).toThrow(/Geçersiz/)
    const broken = JSON.parse(JSON.stringify(model))
    broken.targets.wait_p90.trees[0].t.pop()
    expect(() => parseSurrogate(broken)).toThrow(/uyumsuz/)
  })
})
