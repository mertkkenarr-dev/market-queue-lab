import type { StoreParams } from '@sim/params'
import type { DowGroup, LayoutKind, ModelKind } from '../types/scenario'
import { buildStream, runLayout } from './scenario'

export interface HeroSide {
  /** Varış anı (saat başından sn) ve bekleme (sn), varış sırasıyla. */
  arrival: Float64Array
  wait: Float64Array
  meanWait: number
  waitP90: number
}

export interface HeroData {
  customers: number
  lanes: number
  separate: HeroSide
  pooled: Record<ModelKind, HeroSide>
}

function side(params: StoreParams, day: DowGroup, hour: number, lanes: number, layout: LayoutKind, model: ModelKind, seed: number): HeroSide {
  const run = runLayout(buildStream(params, day, hour, seed), lanes, layout, model)
  const arrival = Float64Array.from(run.journeys, (j) => j.arrival)
  const wait = Float64Array.from(run.journeys, (j) => j.start - j.arrival)
  return { arrival, wait, meanWait: run.meanWait, waitP90: run.waitP90 }
}

/** Aynı müşteri akışı (aynı tohum) üç kez: ayrı kuyruk, ortak kuyruk ders kitabı, ortak kuyruk saha. */
export function heroData(params: StoreParams, day: DowGroup, hour: number, lanes: number, seed: number): HeroData {
  const separate = side(params, day, hour, lanes, 'separate-jsq', 'saha', seed)
  return {
    customers: separate.arrival.length,
    lanes,
    separate,
    pooled: { saha: side(params, day, hour, lanes, 'pooled', 'saha', seed), ders: side(params, day, hour, lanes, 'pooled', 'ders', seed) },
  }
}
