import { simulate, type Layout, type SimResult } from '../src/engine'
import { generateCustomers } from '../src/generators'
import { Random } from '../src/random'
import { summarize, type Summary } from '../src/stats'

export interface Scenario {
  lambda: number
  servers: number
  layout: Layout
  sampleService: (rng: Random) => number
  reps: number
  horizon: number
  warmup: number
  baseSeed?: number
}

export type Replicated = { [K in keyof Pick<SimResult,
  'meanWait' | 'meanSojourn' | 'probWait' | 'meanQueueLength' | 'meanInSystem' | 'utilization' | 'arrivalRate'>]: Summary }

export function replicate(s: Scenario): { summary: Replicated; runs: SimResult[] } {
  const runs: SimResult[] = []
  for (let r = 0; r < s.reps; r++) {
    const seed = (s.baseSeed ?? 1000) + r
    const customers = generateCustomers(
      { rate: () => s.lambda, rateMax: s.lambda, horizon: s.horizon, sampleService: (rng) => s.sampleService(rng) },
      new Random(seed),
    )
    runs.push(simulate(customers, { servers: s.servers, layout: s.layout, warmup: s.warmup, horizon: s.horizon, routingSeed: seed + 7919 }))
  }
  const pick = (f: (r: SimResult) => number): Summary => summarize(runs.map(f))
  return {
    runs,
    summary: {
      meanWait: pick((r) => r.meanWait),
      meanSojourn: pick((r) => r.meanSojourn),
      probWait: pick((r) => r.probWait),
      meanQueueLength: pick((r) => r.meanQueueLength),
      meanInSystem: pick((r) => r.meanInSystem),
      utilization: pick((r) => r.utilization),
      arrivalRate: pick((r) => r.arrivalRate),
    },
  }
}
