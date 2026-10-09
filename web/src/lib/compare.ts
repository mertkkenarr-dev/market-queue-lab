import type { StoreParams } from '@sim/params'
import { summarize, type Summary } from '@sim/stats'
import type { DowGroup } from '../types/scenario'
import { buildStream, runSummary, type RunSummary } from './scenario'

const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length

export interface PairedComparison {
  reps: number
  separate: { meanWait: Summary; waitP90: number; probWait: number; utilization: number }
  pooled: { meanWait: Summary; waitP90: number; probWait: number; utilization: number }
  /** ayrı − ortak: pozitif = ortak kuyruk daha kısa bekletiyor. Aynı müşteri akışı üzerinde eşleştirilmiş. */
  diff: Summary
}

const collect = (rs: readonly RunSummary[]) => ({
  meanWait: summarize(rs.map((r) => r.meanWait)),
  waitP90: mean(rs.map((r) => r.waitP90)),
  probWait: mean(rs.map((r) => r.probWait)),
  utilization: mean(rs.map((r) => r.utilization)),
})

/**
 * Her tekrarda ikisi de aynı müşteri akışını görür (ortak rastgele sayılar), bu yüzden fark
 * eşleştirilmiş örneklemle tahmin edilir: akış değişkenliği farktan çıkar, aralık daralır.
 */
export function pairedComparison(params: StoreParams, day: DowGroup, hour: number, lanes: number, reps = 30): PairedComparison {
  const sep: RunSummary[] = []
  const pool: RunSummary[] = []
  for (let r = 0; r < reps; r++) {
    const stream = buildStream(params, day, hour, 1000 + r)
    if (stream.customers.length === 0) continue
    sep.push(runSummary(stream, lanes, 'separate-jsq'))
    pool.push(runSummary(stream, lanes, 'pooled'))
  }
  if (sep.length === 0) throw new Error('Bu gün ve saatte müşteri yok')
  return {
    reps: sep.length,
    separate: collect(sep),
    pooled: collect(pool),
    diff: summarize(sep.map((s, i) => s.meanWait - (pool[i] as RunSummary).meanWait)),
  }
}

const fmtSeconds = (s: number): string => (Math.abs(s) >= 60 ? `${Math.floor(Math.abs(s) / 60)} dk ${Math.round(Math.abs(s) % 60)} sn` : `${Math.round(Math.abs(s))} sn`)

/** Sonucu olduğu gibi söyleyen cümle: aralık sıfırı kapsıyorsa "fark belirgin değil" der. */
export function describeComparison(c: PairedComparison): string {
  const d = c.diff
  if (d.ciLow <= 0 && d.ciHigh >= 0) {
    return `Bu yükte ve ${c.reps} tekrarda iki düzen arasında belirgin bir ortalama bekleme farkı yok (fark ${fmtSeconds(d.mean)}, %95 aralığı sıfırı kapsıyor).`
  }
  const pct = Math.round((Math.abs(d.mean) / (d.mean > 0 ? c.separate.meanWait.mean : c.pooled.meanWait.mean)) * 100)
  return d.mean > 0
    ? `Aynı müşteriler, aynı kasalar: tek ortak kuyruk ortalama beklemeyi ${fmtSeconds(d.mean)} (%${pct}) kısaltıyor.`
    : `Aynı müşteriler, aynı kasalar: ayrı kuyruklar ortalama beklemeyi ${fmtSeconds(d.mean)} (%${pct}) kısaltıyor.`
}
