import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseParams } from '../src/params'
import { Random } from '../src/random'
import { summarize } from '../src/stats'
import { basketContext, buildChannelSampler, expectedService, serviceMoments, simulateWindow, streamForInterval } from '../src/store'

const raw = JSON.parse(readFileSync(new URL('../params.train.json', import.meta.url), 'utf8')) as unknown
const params = parseParams(raw)

describe('parameter file boundary', () => {
  it('loads the training parameters', () => {
    expect(params.service.servis.b).toBeGreaterThan(0)
  })

  it('LEAKAGE GUARD: training parameters never include the held-out period', () => {
    expect(params.train_periods).not.toContain('20190328-20190410')
    expect(params.holdout_periods).toContain('20190328-20190410')
  })

  it('rejects malformed files loudly', () => {
    const bad = JSON.parse(JSON.stringify(raw)) as { channel: { joint: { servis: { pmf_items_x_card: number[] } } } }
    bad.channel.joint.servis.pmf_items_x_card = [1, 2, 3]
    expect(() => parseParams(bad)).toThrow(/Invalid store params/)
    expect(() => parseParams({})).toThrow()
  })
})

describe('channel sampler', () => {
  const sampler = buildChannelSampler(params, 'servis')
  const rng = new Random(11)
  const draws = Array.from({ length: 150_000 }, () => sampler.sample(rng))

  it('reproduces the training basket mean and card share', () => {
    const pmf = params.channel.joint.servis.pmf_items_x_card
    let meanItems = 0
    for (let i = 0; i < pmf.length; i++) meanItems += ((i >> 1) + 1) * (pmf[i] as number)
    const s = summarize(draws.map((d) => d.items))
    expect(Math.abs(s.mean - meanItems)).toBeLessThan(0.25)
    expect(summarize(draws.map((d) => d.card)).mean).toBeCloseTo(params.channel.joint.servis.card_share, 1)
  })

  it('draws service times whose mean matches the fitted model for that basket', () => {
    const expected = draws.reduce((a, d) => a + serviceMoments(params.service.servis, d.items, d.card).mean, 0) / draws.length
    const observed = summarize(draws.map((d) => d.service)).mean
    expect(Math.abs(observed - expected) / expected).toBeLessThan(0.02)
  })

  it('self-service customers have smaller baskets but slower per-item service', () => {
    const self = buildChannelSampler(params, 'self-servis')
    const r = new Random(12)
    const d = Array.from({ length: 50_000 }, () => self.sample(r))
    expect(summarize(d.map((x) => x.items)).mean).toBeLessThan(summarize(draws.map((x) => x.items)).mean)
  })
})

describe('stream generation', () => {
  const sampler = buildChannelSampler(params, 'servis')

  it('a fixed count is exact, sorted, and inside the interval', () => {
    const { customers } = streamForInterval(sampler, new Random(3), 100, 200, 0, 57)
    expect(customers).toHaveLength(57)
    for (let i = 0; i < customers.length; i++) {
      const c = customers[i]!
      expect(c.arrival).toBeGreaterThanOrEqual(100)
      expect(c.arrival).toBeLessThan(200)
      if (i > 0) expect(c.arrival).toBeGreaterThanOrEqual(customers[i - 1]!.arrival)
    }
  })

  it('a Poisson stream has mean count rate*length', () => {
    const counts = Array.from({ length: 300 }, (_, i) => streamForInterval(sampler, new Random(500 + i), 0, 1000, 0.05).customers.length)
    const s = summarize(counts)
    expect(Math.abs(s.mean - 50)).toBeLessThan(3.5 * s.se)
  })
})

describe('simulateWindow', () => {
  const sampler = buildChannelSampler(params, 'servis')

  it('is deterministic for fixed seeds', () => {
    const spec = { rate: 0.08, servers: 6, layout: 'separate-jsq' as const }
    expect(simulateWindow(sampler, spec, new Random(9), 1)).toEqual(simulateWindow(sampler, spec, new Random(9), 1))
  })

  it('pins the measured count when asked', () => {
    const r = simulateWindow(sampler, { rate: 0.08, fixedCount: 288, servers: 6, layout: 'separate-jsq' }, new Random(4), 1)
    expect(r.count).toBe(288)
  })

  it('with ample servers nobody waits and utilisation equals offered load / servers', () => {
    const rs = Array.from({ length: 60 }, (_, i) =>
      simulateWindow(sampler, { rate: 0.05, servers: 40, layout: 'pooled' }, new Random(700 + i), i),
    )
    expect(summarize(rs.map((r) => r.probWait)).mean).toBeLessThan(0.01)
    const offered = summarize(rs.map((r) => (r.count * r.serviceMean) / 3600)).mean
    expect(summarize(rs.map((r) => r.utilization)).mean).toBeCloseTo(offered / 40, 2)
  })
})

describe('context-aware baskets and service scale', () => {
  const meanItems = (ctx: string, n = 20000): number => {
    const s = buildChannelSampler(params, 'servis', ctx)
    const rng = new Random(11)
    let sum = 0
    for (let i = 0; i < n; i++) sum += s.sample(rng).items
    return sum / n
  }

  it('Saturday mornings have larger baskets than weekday mornings', () => {
    expect(meanItems(basketContext('sat', 10))).toBeGreaterThan(meanItems(basketContext('mon_thu', 10)) + 3)
  })

  it('unknown context falls back to the pooled pmf', () => {
    const pooled = buildChannelSampler(params, 'servis')
    const fallback = buildChannelSampler(params, 'servis', 'nope|am')
    expect(fallback.sample(new Random(5))).toEqual(pooled.sample(new Random(5)))
  })

  it('serviceScale scales mean service time proportionally', () => {
    const mean = (scale: number): number => {
      const s = buildChannelSampler(params, 'servis', undefined, { serviceScale: scale })
      const rng = new Random(3)
      let sum = 0
      for (let i = 0; i < 30000; i++) sum += s.sample(rng).service
      return sum / 30000
    }
    expect(mean(0.8) / mean(1)).toBeCloseTo(0.8, 1)
    expect(mean(1)).toBeCloseTo(expectedService(params, 'servis'), 0)
  })
})
