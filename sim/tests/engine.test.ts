import { describe, expect, it } from 'vitest'
import { simulate, type Customer } from '../src/engine'
import { generateCustomers } from '../src/generators'
import { Random } from '../src/random'
import { summarize, type Summary } from '../src/stats'
import { mg1, mmc } from '../src/theory'
import { replicate } from './helpers'

const exp1 = (rng: Random) => rng.exponential(1)

/**
 * A simulated mean must sit within 3.5 standard errors of theory AND within a
 * relative band. The z-bound is the statistical test; the relative band keeps
 * it meaningful when the standard error happens to be large.
 */
function expectMatchesTheory(s: Summary, theory: number, relTol: number, z = 3.5): void {
  expect(Math.abs(s.mean - theory)).toBeLessThanOrEqual(z * s.se)
  expect(Math.abs(s.mean - theory) / theory).toBeLessThanOrEqual(relTol)
}

describe('engine vs closed-form theory (pooled queue)', () => {
  const cases = [
    { name: 'M/M/1 rho=0.7', lambda: 0.7, c: 1 },
    { name: 'M/M/3 rho=0.8', lambda: 2.4, c: 3 },
    { name: 'M/M/5 rho=0.84', lambda: 4.2, c: 5 },
  ]
  for (const { name, lambda, c } of cases) {
    it(`${name}: wait, P(wait), queue length, utilisation match Erlang-C`, () => {
      const { summary: s } = replicate({
        lambda, servers: c, layout: 'pooled', sampleService: exp1,
        reps: 100, horizon: 30000, warmup: 3000, baseSeed: 5000,
      })
      const th = mmc(lambda, 1, c)
      expectMatchesTheory(s.meanWait, th.meanWait, 0.025)
      expectMatchesTheory(s.probWait, th.probWait, 0.01)
      expectMatchesTheory(s.meanQueueLength, th.meanQueueLength, 0.025)
      expectMatchesTheory(s.utilization, th.rho, 0.005)
    })
  }

  it('M/D/1 (deterministic service) matches Pollaczek-Khinchine: half the M/M/1 wait', () => {
    const { summary: s } = replicate({
      lambda: 0.8, servers: 1, layout: 'pooled', sampleService: () => 1,
      reps: 60, horizon: 30000, warmup: 3000, baseSeed: 5000,
    })
    expectMatchesTheory(s.meanWait, mg1(0.8, 1, 0).meanWait, 0.025)
  })

  it('M/G/1 with heavy-tailed lognormal service matches Pollaczek-Khinchine', () => {
    const { summary: s } = replicate({
      lambda: 0.6, servers: 1, layout: 'pooled',
      sampleService: (rng) => rng.lognormalFromMoments(1, 4),
      reps: 100, horizon: 40000, warmup: 4000, baseSeed: 5000,
    })
    expectMatchesTheory(s.meanWait, mg1(0.6, 1, 4).meanWait, 0.04)
  })
})

describe('queue layouts', () => {
  it('c separate queues with random routing behave as c independent M/M/1 queues', () => {
    const { summary: s } = replicate({
      lambda: 2.1, servers: 3, layout: 'separate-random', sampleService: exp1,
      reps: 100, horizon: 30000, warmup: 3000, baseSeed: 5000,
    })
    expectMatchesTheory(s.meanWait, mmc(0.7, 1, 1).meanWait, 0.03)
  })

  it('pooling effect: on identical customer streams, pooled < join-shortest < random routing', () => {
    const base = { lambda: 2.1, servers: 3, sampleService: exp1, reps: 40, horizon: 30000, warmup: 3000, baseSeed: 5000 }
    const pooled = replicate({ ...base, layout: 'pooled' }).summary.meanWait.mean
    const jsq = replicate({ ...base, layout: 'separate-jsq' }).summary.meanWait.mean
    const rand = replicate({ ...base, layout: 'separate-random' }).summary.meanWait.mean
    expect(pooled).toBeLessThan(jsq)
    expect(jsq).toBeLessThan(rand)
    // Same total capacity, ~4x theoretical gap between one shared line and separate random lines.
    expect(rand / pooled).toBeGreaterThan(3.5)
    expect(rand / pooled).toBeLessThan(5)
  })
})

describe('invariants', () => {
  const rng = new Random(42)
  const customers = generateCustomers(
    { rate: () => 2.4, rateMax: 2.4, horizon: 3000, sampleService: (r) => r.exponential(1) }, rng)

  for (const layout of ['pooled', 'separate-random', 'separate-jsq'] as const) {
    it(`${layout}: every customer is served exactly once, never before arrival, servers never overlap`, () => {
      const res = simulate(customers, { servers: 3, layout, warmup: 300, horizon: 3000, trace: true })
      const trace = res.trace!
      expect(res.served).toBe(customers.length)
      expect(trace).toHaveLength(customers.length)
      expect(new Set(trace.map((t) => t.id)).size).toBe(customers.length)
      for (const t of trace) {
        const c = customers[t.id]!
        expect(t.start).toBeGreaterThanOrEqual(t.arrival)
        expect(t.end).toBeCloseTo(t.start + c.service, 9)
      }
      const byServer = new Map<number, typeof trace>()
      for (const t of trace) byServer.set(t.server, [...(byServer.get(t.server) ?? []), t])
      for (const rows of byServer.values()) {
        rows.sort((a, b) => a.start - b.start)
        for (let i = 1; i < rows.length; i++) {
          expect(rows[i]!.start).toBeGreaterThanOrEqual(rows[i - 1]!.end - 1e-9)
        }
      }
    })
  }

  it('pooled queue is FIFO: service starts follow arrival order', () => {
    const res = simulate(customers, { servers: 3, layout: 'pooled', warmup: 300, horizon: 3000, trace: true })
    const starts = [...res.trace!].sort((a, b) => a.id - b.id).map((t) => t.start)
    for (let i = 1; i < starts.length; i++) expect(starts[i]!).toBeGreaterThanOrEqual(starts[i - 1]! - 1e-9)
  })

  it("Little's law L = lambda * W holds in every run", () => {
    const { runs } = replicate({
      lambda: 2.4, servers: 3, layout: 'pooled', sampleService: exp1,
      reps: 20, horizon: 20000, warmup: 2000, baseSeed: 77,
    })
    for (const r of runs) {
      expect(Math.abs(r.meanInSystem - r.arrivalRate * r.meanSojourn) / r.meanInSystem).toBeLessThan(0.015)
    }
  })

  it('is deterministic: same stream and seeds give identical results', () => {
    const cfg = { servers: 3, layout: 'separate-jsq' as const, warmup: 300, horizon: 3000, routingSeed: 5 }
    expect(simulate(customers, cfg)).toEqual(simulate(customers, cfg))
  })
})

describe('edge cases', () => {
  const cfg = { servers: 1, layout: 'pooled' as const, warmup: 0, horizon: 100 }

  it('handles an empty stream', () => {
    const r = simulate([], cfg)
    expect(r.served).toBe(0)
    expect(r.measured).toBe(0)
    expect(r.utilization).toBe(0)
    expect(Number.isNaN(r.meanWait)).toBe(true)
  })

  it('a lone customer waits zero', () => {
    const r = simulate([{ id: 0, arrival: 5, service: 10 }], cfg)
    expect(r.meanWait).toBe(0)
    expect(r.probWait).toBe(0)
    expect(r.meanSojourn).toBe(10)
  })

  it('an arrival at the exact instant a server frees up waits zero', () => {
    const cs: Customer[] = [
      { id: 0, arrival: 0, service: 1 },
      { id: 1, arrival: 1, service: 1 },
    ]
    expect(simulate(cs, cfg).meanWait).toBe(0)
  })

  it('a second simultaneous arrival waits for the first', () => {
    const cs: Customer[] = [
      { id: 0, arrival: 0, service: 4 },
      { id: 1, arrival: 0, service: 4 },
    ]
    expect(simulate(cs, cfg).meanWait).toBe(2)
  })

  it('rejects unsorted streams, bad server counts, and inverted windows', () => {
    expect(() => simulate([{ id: 0, arrival: 2, service: 1 }, { id: 1, arrival: 1, service: 1 }], cfg)).toThrow()
    expect(() => simulate([], { ...cfg, servers: 0 })).toThrow()
    expect(() => simulate([], { ...cfg, warmup: 50, horizon: 50 })).toThrow()
  })

  it('reports share of customers waiting at most a threshold', () => {
    const cs: Customer[] = [
      { id: 0, arrival: 0, service: 10 },
      { id: 1, arrival: 1, service: 10 },
      { id: 2, arrival: 2, service: 10 },
    ]
    const r = simulate(cs, { ...cfg, waitThresholds: [0, 9, 20] })
    // waits are 0, 9, 18
    expect(r.fractionWaitingAtMost).toEqual([1 / 3, 2 / 3, 1])
  })
})

describe('arrival generation', () => {
  it('thinning reproduces a piecewise rate: counts match the integral of lambda', () => {
    const counts = Array.from({ length: 200 }, (_, i) =>
      generateCustomers(
        { rate: (t) => (t < 500 ? 1 : 3), rateMax: 3, horizon: 1000, sampleService: () => 1 },
        new Random(900 + i),
      ).length,
    )
    const s = summarize(counts)
    expect(Math.abs(s.mean - 2000)).toBeLessThanOrEqual(3.5 * s.se)
    // Poisson counts: variance ~ mean
    expect(s.sd ** 2 / s.mean).toBeGreaterThan(0.7)
    expect(s.sd ** 2 / s.mean).toBeLessThan(1.4)
  })

  it('rejects a rate above rateMax (would silently bias the process)', () => {
    expect(() =>
      generateCustomers({ rate: () => 5, rateMax: 3, horizon: 100, sampleService: () => 1 }, new Random(1)),
    ).toThrow()
  })
})

describe('lane mechanics: changeover, walk from a pooled queue, slowdown', () => {
  const rng = new Random(11)
  const base = generateCustomers(
    { rate: () => 2.2, rateMax: 2.2, horizon: 4000, sampleService: (r) => r.exponential(1) }, rng)
  const withCo = base.map((c, i) => ({ ...c, changeover: 0.1 + 0.3 * ((i * 7) % 5) / 4 }))
  const folded = withCo.map((c) => ({ id: c.id, arrival: c.arrival, service: c.service + (c.changeover ?? 0) }))

  for (const layout of ['pooled', 'separate-jsq'] as const) {
    it(`${layout}: changeover blocks the lane exactly like extra service time, but is not scanning`, () => {
      const cfg = { servers: 3, layout, warmup: 400, horizon: 4000, routingSeed: 3, trace: true }
      const a = simulate(withCo, cfg)
      const b = simulate(folded, cfg)
      expect(a.meanWait).toBeCloseTo(b.meanWait, 9)
      expect(a.utilization).toBeCloseTo(b.utilization, 9)
      expect(a.scanUtilization).toBeLessThan(a.utilization)
      for (const t of a.trace!) expect(t.end - t.scanEnd).toBeCloseTo(withCo[t.id]!.changeover!, 9)
    })
  }

  it('pooled: a called customer walks to the lane; the lane is held (not reused) during the walk', () => {
    const walkToServer = [2, 4, 6]
    const res = simulate(base, { servers: 3, layout: 'pooled', warmup: 400, horizon: 4000, trace: true, walkToServer })
    const trace = res.trace!
    let walked = 0
    for (const t of trace) {
      if (t.called > t.arrival + 1e-12) {
        expect(t.start - t.called).toBeCloseTo(walkToServer[t.server]!, 9)
        walked++
      } else {
        expect(t.start).toBe(t.arrival)
      }
    }
    expect(walked).toBeGreaterThan(100)
    const byServer = new Map<number, typeof trace>()
    for (const t of trace) byServer.set(t.server, [...(byServer.get(t.server) ?? []), t])
    for (const rows of byServer.values()) {
      rows.sort((x, y) => x.called - y.called)
      for (let i = 1; i < rows.length; i++) expect(rows[i]!.called).toBeGreaterThanOrEqual(rows[i - 1]!.end - 1e-9)
    }
    expect(res.meanWait).toBeGreaterThan(simulate(base, { servers: 3, layout: 'pooled', warmup: 400, horizon: 4000 }).meanWait)
  })

  it('walk applies only to the pooled layout', () => {
    const cfg = { servers: 3, layout: 'separate-jsq' as const, warmup: 400, horizon: 4000, routingSeed: 2 }
    expect(simulate(base, { ...cfg, walkToServer: [5, 5, 5] })).toEqual(simulate(base, cfg))
  })

  it('service multiplier stretches scanning and nothing else', () => {
    const res = simulate(withCo, { servers: 3, layout: 'pooled', warmup: 400, horizon: 4000, trace: true, serviceMultiplier: 1.1 })
    for (const t of res.trace!) expect(t.scanEnd - t.start).toBeCloseTo(withCo[t.id]!.service * 1.1, 9)
    expect(() => simulate(base, { servers: 1, layout: 'pooled', warmup: 0, horizon: 10, serviceMultiplier: 0 })).toThrow()
  })

  it("Little's law still holds with changeover and walking", () => {
    const light = generateCustomers(
      { rate: () => 1.4, rateMax: 1.4, horizon: 20000, sampleService: (r) => r.exponential(1) }, new Random(12),
    ).map((c) => ({ ...c, changeover: 0.25 }))
    const r = simulate(light, { servers: 3, layout: 'pooled', warmup: 2000, horizon: 20000, walkToServer: [0.2, 0.4, 0.6] })
    expect(r.utilization).toBeLessThan(0.9)
    expect(Math.abs(r.meanInSystem - r.arrivalRate * r.meanSojourn) / r.meanInSystem).toBeLessThan(0.03)
  })
})
