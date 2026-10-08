import { writeFileSync, mkdirSync } from 'node:fs'
import { replicate } from '../tests/helpers'
import { mmc } from '../src/theory'

const exp1 = (rng: { exponential: (r: number) => number }) => rng.exponential(1)
const rhos = [0.3, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9]
const out: Record<string, unknown> = { rhos, mmc: {}, layouts: {} }

for (const c of [1, 3, 5]) {
  const rows = rhos.map((rho) => {
    const lambda = rho * c
    const { summary: s } = replicate({
      lambda, servers: c, layout: 'pooled', sampleService: exp1,
      reps: 40, horizon: 40000, warmup: 4000, baseSeed: 20000,
    })
    return { rho, theory: mmc(lambda, 1, c).meanWait, sim: s.meanWait.mean, lo: s.meanWait.ciLow, hi: s.meanWait.ciHigh }
  })
  ;(out.mmc as Record<string, unknown>)[String(c)] = rows
  console.log(`c=${c}:`, rows.map((r) => `${r.rho}:${(100 * (r.sim - r.theory) / r.theory).toFixed(1)}%`).join('  '))
}

// Havuzlama: aynı toplam kapasite (c=3), ρ boyunca üç düzen
for (const layout of ['pooled', 'separate-jsq', 'separate-random'] as const) {
  ;(out.layouts as Record<string, unknown>)[layout] = rhos.map((rho) => {
    const { summary: s } = replicate({
      lambda: rho * 3, servers: 3, layout, sampleService: exp1,
      reps: 30, horizon: 30000, warmup: 3000, baseSeed: 31000,
    })
    return { rho, wait: s.meanWait.mean, lo: s.meanWait.ciLow, hi: s.meanWait.ciHigh }
  })
}
mkdirSync('../docs', { recursive: true })
writeFileSync('../docs/validation.json', JSON.stringify(out, null, 2))
console.log('yazıldı: docs/validation.json')
