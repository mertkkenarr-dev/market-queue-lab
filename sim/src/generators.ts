import type { Customer } from './engine'
import { Random } from './random'

export interface StreamSpec {
  /** Arrival intensity at time t (customers per time unit). */
  rate: (t: number) => number
  /** Upper bound on `rate` — required for thinning to be exact. */
  rateMax: number
  horizon: number
  sampleService: (rng: Random, t: number) => number
}

/**
 * Non-homogeneous Poisson arrivals by thinning (Lewis-Shedler): draw
 * candidates at rateMax, keep each with probability rate(t)/rateMax.
 * A constant rate reduces to a plain Poisson process.
 */
export function generateCustomers(spec: StreamSpec, rng: Random): Customer[] {
  const customers: Customer[] = []
  let t = 0
  for (;;) {
    t += rng.exponential(spec.rateMax)
    if (t >= spec.horizon) break
    const r = spec.rate(t)
    if (r > spec.rateMax + 1e-9) throw new Error(`rate(${t}) = ${r} exceeds rateMax = ${spec.rateMax}`)
    if (rng.uniform() * spec.rateMax <= r) {
      customers.push({ id: customers.length, arrival: t, service: spec.sampleService(rng, t) })
    }
  }
  return customers
}
