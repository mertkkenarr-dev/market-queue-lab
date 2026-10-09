import type { Customer } from '@sim/engine'
import { simulate } from '@sim/engine'
import type { StoreParams } from '@sim/params'
import { Random } from '@sim/random'
import { basketContext, buildChannelSampler, selfServiceShare, streamForInterval } from '@sim/store'
import type { DowGroup, Journey, LayoutKind } from '../types/scenario'

const HOUR = 3600

export interface Stream {
  customers: Customer[]
  items: number[]
  ratePerHour: number
}

export interface LayoutRun {
  journeys: Journey[]
  meanWait: number
  waitP90: number
  probWait: number
  utilization: number
  /** Son müşterinin hizmeti bitene kadar süre (sn); zaman çubuğunun sonu. */
  endTime: number
}

/**
 * Müşteri akışı kasa sayısından ve düzenden bağımsız üretilir: aynı tohum, aynı müşteriler.
 * Düzenler bu yüzden adil karşılaştırılır (ortak rastgele sayılar).
 */
export function buildStream(params: StoreParams, day: DowGroup, hour: number, seed: number): Stream {
  const perSecond = params.arrival_profile.per_second_by_group_hour[day]?.[String(hour)] ?? 0
  const rate = perSecond * (1 - selfServiceShare(params, hour))
  const sampler = buildChannelSampler(params, 'servis', basketContext(day, hour))
  const { customers, items } = streamForInterval(sampler, new Random(seed), 0, HOUR, rate)
  return { customers, items, ratePerHour: rate * HOUR }
}

export function runLayout(stream: Stream, lanes: number, layout: LayoutKind): LayoutRun {
  const res = simulate(stream.customers, { servers: lanes, layout, warmup: 0, horizon: HOUR, routingSeed: 1, trace: true })
  const trace = res.trace ?? []
  const journeys: Journey[] = Array.from({ length: stream.customers.length })
  let endTime = 0
  for (const r of trace) {
    journeys[r.id] = { arrival: r.arrival, start: r.start, end: r.end, lane: r.server, items: stream.items[r.id] ?? 1 }
    if (r.end > endTime) endTime = r.end
  }
  return { journeys, meanWait: res.meanWait, waitP90: res.waitP90, probWait: res.probWait, utilization: res.utilization, endTime }
}

export interface RunSummary {
  meanWait: number
  waitP90: number
  probWait: number
  utilization: number
}

/** İz tutmayan hafif koşu: çok tekrarlı karşılaştırmada yüzlerce kez çağrılır. */
export function runSummary(stream: Stream, lanes: number, layout: LayoutKind): RunSummary {
  const r = simulate(stream.customers, { servers: lanes, layout, warmup: 0, horizon: HOUR, routingSeed: 1 })
  return { meanWait: r.meanWait, waitP90: r.waitP90, probWait: r.probWait, utilization: r.utilization }
}
