import { simulate, type Customer, type SimResult } from './engine'
import { Random, toCdf } from './random'
import type { Channel, ServiceModel, StoreParams } from './params'

export interface ChannelSampler {
  sample(rng: Random): { items: number; card: number; service: number }
}

/** Service time for a basket: moment-matched lognormal with mean/variance from the fitted model. */
export function serviceMoments(m: ServiceModel, items: number, card: number): { mean: number; variance: number } {
  const mean = Math.max(1, m.a + m.card_extra * card + m.b * items ** m.gamma)
  const variance = Math.max(1, m.v0 + m.v1 * items)
  return { mean, variance }
}

/** Context key shared with scripts/03_fit.py: day type x half of day. */
export function basketContext(dowGroup: string, hour: number): string {
  return `${dowGroup}|${hour >= 17 ? 'pm' : 'am'}`
}

/**
 * Basket and payment are resampled jointly from the training data, not drawn
 * from a fitted family: the parametric fits misplaced the median basket by ~8%
 * and the items/card dependence is preserved for free this way.
 */
export interface SamplerOptions {
  /** Multiplies mean and standard deviation of service time (recalibration to a faster/slower crew). */
  serviceScale?: number
}

export function expectedService(p: StoreParams, channel: Channel, context?: string): number {
  const joint = p.channel.joint[channel]
  const pmf = (context !== undefined ? joint.by_context?.[context]?.pmf_items_x_card : undefined) ?? joint.pmf_items_x_card
  let e = 0
  pmf.forEach((w, idx) => {
    e += w * serviceMoments(p.service[channel], (idx >> 1) + 1, idx & 1).mean
  })
  return e
}

export function buildChannelSampler(p: StoreParams, channel: Channel, context?: string, opts: SamplerOptions = {}): ChannelSampler {
  const scale = opts.serviceScale ?? 1
  const joint = p.channel.joint[channel]
  const pmf = (context !== undefined ? joint.by_context?.[context]?.pmf_items_x_card : undefined) ?? joint.pmf_items_x_card
  const cdf = toCdf(pmf)
  const model = p.service[channel]
  return {
    sample(rng) {
      const idx = rng.discrete(cdf)
      const items = (idx >> 1) + 1
      const card = idx & 1
      const { mean, variance } = serviceMoments(model, items, card)
      return { items, card, service: rng.lognormalFromMoments(mean * scale, variance * scale * scale) }
    },
  }
}

export function selfServiceShare(p: StoreParams, hour: number): number {
  return p.channel.share_by_hour[String(hour)] ?? p.channel.self_service_share
}

export interface TaggedCustomers {
  customers: Customer[]
  items: number[]
}

/**
 * Poisson stream at constant `rate` over [t0, t1). With `fixedCount`, the number of
 * customers is pinned and arrival times are iid uniform — exactly a Poisson process
 * conditioned on its count, used to validate the queue logic against an observed hour
 * without adding arrival-count noise on top.
 */
export function streamForInterval(
  sampler: ChannelSampler,
  rng: Random,
  t0: number,
  t1: number,
  rate: number,
  fixedCount?: number,
): TaggedCustomers {
  const times: number[] = []
  if (fixedCount !== undefined) {
    for (let i = 0; i < fixedCount; i++) times.push(t0 + rng.uniform() * (t1 - t0))
    times.sort((a, b) => a - b)
  } else if (rate > 0) {
    for (let t = t0 + rng.exponential(rate); t < t1; t += rng.exponential(rate)) times.push(t)
  }
  const customers: Customer[] = []
  const items: number[] = []
  times.forEach((arrival, i) => {
    const s = sampler.sample(rng)
    customers.push({ id: i, arrival, service: s.service })
    items.push(s.items)
  })
  return { customers, items }
}

export interface WindowSpec {
  /** Arrival intensity (customers/second) for this channel. */
  rate: number
  /** Pin the count of measured-hour arrivals (conditional validation); omit for a Poisson hour. */
  fixedCount?: number
  servers: number
  layout: 'pooled' | 'separate-jsq'
}

export interface WindowResult {
  count: number
  basketMean: number
  serviceMean: number
  utilization: number
  meanWait: number
  waitP90: number
  probWait: number
}

const WARMUP = 1800
const HOUR = 3600

/**
 * One hour of one channel, treated as stationary: a 30-minute warm-up at the same
 * rate fills the system before the measured hour. Real queues carry state across
 * hours; ignoring that is an approximation we state, not hide.
 */
export function simulateWindow(sampler: ChannelSampler, spec: WindowSpec, rng: Random, routingSeed: number): WindowResult {
  const warm = streamForInterval(sampler, rng, 0, WARMUP, spec.rate)
  const meas = streamForInterval(sampler, rng, WARMUP, WARMUP + HOUR, spec.rate, spec.fixedCount)
  const customers = [...warm.customers, ...meas.customers].map((c, i) => ({ ...c, id: i }))
  const res: SimResult = simulate(customers, {
    servers: spec.servers,
    layout: spec.layout,
    warmup: WARMUP,
    horizon: WARMUP + HOUR,
    routingSeed,
  })
  const n = meas.customers.length
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : Number.NaN)
  return {
    count: n,
    basketMean: mean(meas.items),
    serviceMean: mean(meas.customers.map((c) => c.service)),
    utilization: res.utilization,
    meanWait: res.meanWait,
    waitP90: res.waitP90,
    probWait: res.probWait,
  }
}
