/**
 * Deterministic, seedable RNG. Reproducibility is the point: every
 * simulation result in this project must be re-derivable from a seed, and
 * layouts must be comparable on identical customer streams.
 */
export class Random {
  private state: number
  private spare: number | null = null

  constructor(seed: number) {
    // Scramble so consecutive integer seeds (replication 1, 2, 3...) give
    // unrelated streams instead of near-identical ones.
    let s = (seed | 0) ^ 0x9e3779b9
    s = Math.imul(s ^ (s >>> 16), 0x85ebca6b)
    s = Math.imul(s ^ (s >>> 13), 0xc2b2ae35)
    this.state = (s ^ (s >>> 16)) | 0
  }

  /** Uniform on [0, 1) — mulberry32. */
  uniform(): number {
    this.state = (this.state + 0x6d2b79f5) | 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  exponential(rate: number): number {
    return -Math.log(1 - this.uniform()) / rate
  }

  /** Standard normal via Box-Muller; the second variate is cached. */
  normal(): number {
    if (this.spare !== null) {
      const z = this.spare
      this.spare = null
      return z
    }
    const u1 = 1 - this.uniform()
    const u2 = this.uniform()
    const r = Math.sqrt(-2 * Math.log(u1))
    this.spare = r * Math.sin(2 * Math.PI * u2)
    return r * Math.cos(2 * Math.PI * u2)
  }

  lognormal(mu: number, sigma: number): number {
    return Math.exp(mu + sigma * this.normal())
  }

  /** Lognormal parameterised by its own mean and variance (not the log-scale ones). */
  lognormalFromMoments(mean: number, variance: number): number {
    const s2 = Math.log1p(variance / (mean * mean))
    return this.lognormal(Math.log(mean) - s2 / 2, Math.sqrt(s2))
  }

  bernoulli(p: number): boolean {
    return this.uniform() < p
  }

  /** Index drawn from a cumulative distribution table (last entry must be 1). */
  discrete(cdf: readonly number[]): number {
    const u = this.uniform()
    let lo = 0
    let hi = cdf.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if ((cdf[mid] as number) < u) lo = mid + 1
      else hi = mid
    }
    return lo
  }

  /** Uniform integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.uniform() * n)
  }
}

export function toCdf(pmf: readonly number[]): number[] {
  const total = pmf.reduce((a, b) => a + b, 0)
  let acc = 0
  const cdf = pmf.map((p) => (acc += p / total))
  cdf[cdf.length - 1] = 1
  return cdf
}
