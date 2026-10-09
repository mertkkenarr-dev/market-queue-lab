import { describe, expect, it } from 'vitest'
import raw from '../data/validation.json'
import { parseValidation, scatterStats, worstTheoryGapPct } from './validationData'

describe('validation data', () => {
  it('parses the exported summaries', () => {
    const r = parseValidation(raw)
    expect(r.status).toBe('ok')
  })

  it('reports which field is broken instead of crashing', () => {
    const broken = JSON.parse(JSON.stringify(raw))
    delete broken.surrogate.by_rho
    const r = parseValidation(broken)
    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.message).toContain('surrogate.by_rho')
  })

  it('computes bias, MAPE and 90% coverage from the rows', () => {
    const s = scatterStats([[100, 90, 110, 120], [100, 80, 120, 130], [200, 150, 160, 170]])
    expect(s.n).toBe(3)
    expect(s.biasPct).toBeCloseTo(((0.1 + 0.2 - 0.2) / 3) * 100)
    expect(s.mapePct).toBeCloseTo(((0.1 + 0.2 + 0.2) / 3) * 100)
    expect(s.coveragePct).toBeCloseTo((2 / 3) * 100)
  })

  it('ignores rows without a positive real value', () => {
    expect(scatterStats([[0, 1, 1, 1]]).n).toBe(0)
  })

  it('finds the engine staying within a few percent of queueing theory', () => {
    const r = parseValidation(raw)
    if (r.status !== 'ok') throw new Error(r.message)
    expect(worstTheoryGapPct(r.data.theory)).toBeLessThan(3)
  })
})
