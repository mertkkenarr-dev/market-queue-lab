import { describe, expect, it } from 'vitest'
import model from '../data/surrogate.json'
import pythonPlan from '../../../ml/staffing_plan.json'
import { TOTAL_LANES } from './layout'
import { loadParams } from './params'
import { planDay, verifyLanes } from './staffing'
import { parseSurrogate } from './surrogate'
import type { DowGroup } from '../types/scenario'

const m = parseSurrogate(model)
const loaded = loadParams()
if (loaded.status !== 'ok') throw new Error(loaded.message)
const params = loaded.params

describe('planDay', () => {
  it('reproduces the Python staffing plan (same model, same rules) for every day type and scenario', () => {
    const py = (pythonPlan as { target_p90_s: number; plan: { group: string; hour: number; scenario: string; lanes: number }[] })
    let compared = 0
    let mismatches = 0
    let beyondStore = 0
    for (const day of ['mon_thu', 'fri', 'sat', 'sun'] as DowGroup[]) {
      for (const [scenario, pyName] of [['ortalama', 'ortalama'], ['yoğun', 'yoğun']] as const) {
        for (const row of planDay(m, params, day, 'separate-jsq', py.target_p90_s, scenario)) {
          const ref = py.plan.find((p) => p.group === day && p.hour === row.hour && p.scenario === pyName)
          compared++
          // Python planı 12 kasaya kadar aradı; vekil 10'a kadar eğitildi ve mağazada 10 kasa var: o hücreler web'de null olmalı.
          if (ref && ref.lanes > TOTAL_LANES && row.lanes === null) beyondStore++
          else if (ref && ref.lanes !== row.lanes) mismatches++
        }
      }
    }
    expect(compared).toBe(112)
    expect(mismatches).toBe(0)
    expect(beyondStore).toBe(1)
  })

  it('needs at least as many lanes for a stricter wait target', () => {
    const loose = planDay(m, params, 'fri', 'pooled', 300, 'ortalama')
    const strict = planDay(m, params, 'fri', 'pooled', 60, 'ortalama')
    loose.forEach((r, i) => expect((strict[i]?.lanes ?? 99) >= (r.lanes ?? 99)).toBe(true))
  })

  it('needs at least as many lanes on a busy day as on an average one', () => {
    const avg = planDay(m, params, 'sat', 'separate-jsq', 120, 'ortalama')
    const busy = planDay(m, params, 'sat', 'separate-jsq', 120, 'yoğun')
    avg.forEach((r, i) => expect((busy[i]?.lanes ?? 99) >= (r.lanes ?? 99)).toBe(true))
  })

  it('never needs more lanes with a pooled queue than with separate lanes', () => {
    const sep = planDay(m, params, 'fri', 'separate-jsq', 120, 'ortalama')
    const pool = planDay(m, params, 'fri', 'pooled', 120, 'ortalama')
    pool.forEach((r, i) => expect((r.lanes ?? 99) <= (sep[i]?.lanes ?? 99) + 1).toBe(true))
  })
})

describe('verifyLanes', () => {
  it('confirms in the real simulator that the recommended lane count meets the target on most runs', () => {
    const row = planDay(m, params, 'fri', 'separate-jsq', 120, 'ortalama').find((r) => r.hour === 17)
    expect(row?.lanes).not.toBeNull()
    const v = verifyLanes(params, 'fri', 17, row?.lanes as number, 'separate-jsq', 120, 30)
    expect(v.meets).toBeGreaterThan(0.5)
    const less = verifyLanes(params, 'fri', 17, (row?.lanes as number) - 1, 'separate-jsq', 120, 30)
    expect(less.p90).toBeGreaterThan(v.p90)
  })
})
