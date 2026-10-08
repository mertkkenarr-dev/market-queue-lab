import { replicate } from '../tests/helpers'
import { mmc } from '../src/theory'
const exp = (rng: { exponential: (r: number) => number }) => rng.exponential(1)
for (const baseSeed of [5000, 91000, 777000]) {
  for (const [lambda, c, reps, horizon, warmup] of [[0.7, 1, 100, 30000, 3000], [2.4, 3, 100, 30000, 3000], [0.7, 1, 20, 150000, 15000]] as const) {
    const { summary: s } = replicate({ lambda, servers: c, layout: 'pooled', sampleService: exp, reps, horizon, warmup, baseSeed })
    const th = mmc(lambda, 1, c).meanWait
    const z = (s.meanWait.mean - th) / s.meanWait.se
    console.log(`seed ${String(baseSeed).padEnd(6)} M/M/${c} λ=${lambda} reps=${String(reps).padEnd(3)} T=${horizon}: Wq sim=${s.meanWait.mean.toFixed(4)} teori=${th.toFixed(4)} hata=${(100*(s.meanWait.mean-th)/th).toFixed(2)}%  z=${z.toFixed(2)}`)
  }
}
