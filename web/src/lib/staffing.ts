import type { StoreParams } from '@sim/params'
import { basketContext, expectedService, selfServiceShare } from '@sim/store'
import { summarize } from '@sim/stats'
import type { DowGroup } from '../types/scenario'
import { TOTAL_LANES } from './layout'
import { buildStream, runSummary } from './scenario'
import { predict, type SurrogateModel } from './surrogate'

export type StaffingLayout = 'pooled' | 'separate-jsq'
export type Scenario = 'ortalama' | 'yoğun'

const Z90 = 1.2816
const MAX_RHO = 0.98

export interface StaffingRow {
  hour: number
  scenario: Scenario
  lamPerHour: number
  meanService: number
  /** Hedefi sağlayan en az kasa; yoksa null (10 kasayla bile sağlanamıyor). */
  lanes: number | null
  predP90: number | null
  predP90OneLess: number | null
}

const rhoOf = (lam: number, es: number, c: number): number => (lam * es) / 3600 / c

/**
 * Her saat için, vekil modele göre P90 bekleme ≤ hedef olan en küçük kasa sayısı.
 * ρ<0,98 koşulu: vekil eğitim aralığının (ρ≤1,05) kenarında güvenilmez. "Yoğun gün" talebi,
 * günlük çarpanın %90 üst dilimidir (σ_gün, eğitimden).
 */
export function planDay(model: SurrogateModel, params: StoreParams, day: DowGroup, layout: StaffingLayout, targetP90: number, scenario: Scenario): StaffingRow[] {
  const profile = params.arrival_profile.per_second_by_group_hour[day] ?? {}
  const mult = scenario === 'yoğun' ? Math.exp(params.arrival_profile.sigma_day * Z90) : 1
  const rows: StaffingRow[] = []
  for (const key of Object.keys(profile).sort((a, b) => Number(a) - Number(b))) {
    const hour = Number(key)
    if (hour < 8 || hour > 21) continue
    const lam = (profile[key] as number) * 3600 * (1 - selfServiceShare(params, hour)) * mult
    const es = expectedService(params, 'servis', basketContext(day, hour))
    const p90 = (c: number): number => predict(model, { lanes: c, pooled: layout === 'pooled', rho: rhoOf(lam, es, c), meanService: es }).waitP90
    let lanes: number | null = null
    for (let c = 1; c <= TOTAL_LANES; c++) {
      if (rhoOf(lam, es, c) < MAX_RHO && p90(c) <= targetP90) {
        lanes = c
        break
      }
    }
    rows.push({ hour, scenario, lamPerHour: lam, meanService: es, lanes, predP90: lanes ? p90(lanes) : null, predP90OneLess: lanes && lanes > 1 ? p90(lanes - 1) : null })
  }
  return rows
}

export interface Verification {
  /** Önerilen kasa sayısıyla simülatörün ortalama P90'ı (sn). */
  p90: number
  /** Tekrarların kaçında P90 hedefi sağlandı (0–1). */
  meets: number
}

/** Planı gerçek simülatörle sınar: aynı müşteri akışı, `reps` tekrar, ortalama gün talebi. */
export function verifyLanes(params: StoreParams, day: DowGroup, hour: number, lanes: number, layout: StaffingLayout, targetP90: number, reps = 40): Verification {
  const p90s: number[] = []
  for (let r = 0; r < reps; r++) {
    const stream = buildStream(params, day, hour, 5000 + r)
    if (stream.customers.length > 0) p90s.push(runSummary(stream, lanes, layout).waitP90)
  }
  if (p90s.length === 0) return { p90: 0, meets: 1 }
  return { p90: summarize(p90s).mean, meets: p90s.filter((v) => v <= targetP90).length / p90s.length }
}
