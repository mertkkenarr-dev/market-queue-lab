import type { StoreParams } from '@sim/params'
import { summarize, type Summary } from '@sim/stats'
import type { DowGroup, LayoutKind } from '../types/scenario'
import { LAYOUTS } from './layoutNames'
import { buildStream, runSummary, type RunSummary } from './scenario'

const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length

export interface LayoutStats {
  meanWait: Summary
  waitP90: number
  probWait: number
  utilization: number
}

export type Rival = Exclude<LayoutKind, 'pooled'>

export interface PairedComparison {
  reps: number
  layouts: Record<LayoutKind, LayoutStats>
  /** Her rakip düzen için (rakip − ortak) ortalama bekleme farkı: pozitif = ortak kuyruk daha kısa bekletiyor. */
  vsPooled: Record<Rival, Summary>
}

const collect = (rs: readonly RunSummary[]): LayoutStats => ({
  meanWait: summarize(rs.map((r) => r.meanWait)),
  waitP90: mean(rs.map((r) => r.waitP90)),
  probWait: mean(rs.map((r) => r.probWait)),
  utilization: mean(rs.map((r) => r.utilization)),
})

/**
 * Her tekrarda üç düzen de aynı müşteri akışını görür (ortak rastgele sayılar), bu yüzden fark
 * eşleştirilmiş örneklemle tahmin edilir: akış değişkenliği farktan çıkar, aralık daralır.
 */
export function pairedComparison(params: StoreParams, day: DowGroup, hour: number, lanes: number, reps = 30): PairedComparison {
  const runs: Record<LayoutKind, RunSummary[]> = { 'separate-jsq': [], 'separate-random': [], pooled: [] }
  for (let r = 0; r < reps; r++) {
    const stream = buildStream(params, day, hour, 1000 + r)
    if (stream.customers.length === 0) continue
    for (const k of LAYOUTS) runs[k].push(runSummary(stream, lanes, k))
  }
  const n = runs.pooled.length
  if (n === 0) throw new Error('Bu gün ve saatte müşteri yok')
  const diff = (k: Rival): Summary => summarize(runs[k].map((s, i) => s.meanWait - (runs.pooled[i] as RunSummary).meanWait))
  return {
    reps: n,
    layouts: { 'separate-jsq': collect(runs['separate-jsq']), 'separate-random': collect(runs['separate-random']), pooled: collect(runs.pooled) },
    vsPooled: { 'separate-jsq': diff('separate-jsq'), 'separate-random': diff('separate-random') },
  }
}

const fmtSeconds = (s: number): string => {
  const a = Math.abs(s)
  return a >= 60 ? `${Math.floor(a / 60)} dk ${Math.round(a % 60)} sn` : `${Math.round(a)} sn`
}

/** Bir rakibe karşı tek cümlelik, sonuca sadık ifade: aralık sıfırı kapsıyorsa "fark belirgin değil" der. */
function clause(label: string, d: Summary, rivalMean: number, pooledMean: number): string {
  if (d.ciLow <= 0 && d.ciHigh >= 0) return `${label} seçenlere göre belirgin bir fark yok`
  const pct = Math.round((Math.abs(d.mean) / (d.mean > 0 ? rivalMean : pooledMean)) * 100)
  return d.mean > 0
    ? `${label} seçenlere göre ortalama beklemeyi ${fmtSeconds(d.mean)} (%${pct}) kısaltıyor`
    : `${label} seçenlere göre ortalama beklemeyi ${fmtSeconds(d.mean)} (%${pct}) uzatıyor`
}

export function describeComparison(c: PairedComparison): string {
  const pooled = c.layouts.pooled.meanWait.mean
  const random = clause('rastgele kuyruk', c.vsPooled['separate-random'], c.layouts['separate-random'].meanWait.mean, pooled)
  const smart = clause('en kısa kuyruğu', c.vsPooled['separate-jsq'], c.layouts['separate-jsq'].meanWait.mean, pooled)
  return `Aynı müşteriler, aynı kasalar: tek ortak kuyruk, ${random}; ${smart}.`
}
