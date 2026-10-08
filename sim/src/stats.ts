export interface Summary {
  n: number
  mean: number
  sd: number
  se: number
  ciLow: number
  ciHigh: number
}

// Two-sided 95% Student-t critical values for df 1..30; beyond that the
// normal value is close enough for replication counts used here.
const T95 = [
  12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179,
  2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06,
  2.056, 2.052, 2.048, 2.045, 2.042,
]

export function summarize(values: readonly number[]): Summary {
  const n = values.length
  if (n === 0) throw new Error('summarize: empty sample')
  const mean = values.reduce((a, b) => a + b, 0) / n
  if (n === 1) return { n, mean, sd: 0, se: 0, ciLow: mean, ciHigh: mean }
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)
  const sd = Math.sqrt(variance)
  const se = sd / Math.sqrt(n)
  const t = n - 1 <= 30 ? (T95[n - 2] as number) : 1.96
  return { n, mean, sd, se, ciLow: mean - t * se, ciHigh: mean + t * se }
}

/** Linear-interpolated quantile of an already-sorted array. */
export function quantileSorted(sorted: Float64Array | readonly number[], q: number): number {
  const n = sorted.length
  if (n === 0) return Number.NaN
  const pos = q * (n - 1)
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  const a = sorted[lo] as number
  const b = sorted[hi] as number
  return a + (b - a) * (pos - lo)
}
