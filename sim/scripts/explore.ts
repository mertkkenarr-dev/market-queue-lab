import { replicate } from '../tests/helpers'
import { mg1, mmc } from '../src/theory'

const exp = (mu: number) => (rng: { exponential: (r: number) => number }) => rng.exponential(mu)
const show = (name: string, sim: number, se: number, th: number) =>
  console.log(`${name.padEnd(34)} sim=${sim.toFixed(4)} ±${(1.96 * se).toFixed(4)}  teori=${th.toFixed(4)}  hata=${(100 * (sim - th) / th).toFixed(2)}%`)

for (const [lambda, c] of [[0.7, 1], [2.4, 3], [4.2, 5], [0.9, 1]] as const) {
  const t0 = Date.now()
  const { summary: s } = replicate({ lambda, servers: c, layout: 'pooled', sampleService: exp(1), reps: 30, horizon: 30000, warmup: 3000 })
  const th = mmc(lambda, 1, c)
  console.log(`\nM/M/${c} lambda=${lambda} rho=${th.rho.toFixed(3)} (${Date.now() - t0} ms)`)
  show('Wq', s.meanWait.mean, s.meanWait.se, th.meanWait)
  show('P(bekle)', s.probWait.mean, s.probWait.se, th.probWait)
  show('Lq', s.meanQueueLength.mean, s.meanQueueLength.se, th.meanQueueLength)
  show('L', s.meanInSystem.mean, s.meanInSystem.se, th.meanInSystem)
  show('rho (kullanım)', s.utilization.mean, s.utilization.se, th.rho)
}
// M/D/1
const d = replicate({ lambda: 0.8, servers: 1, layout: 'pooled', sampleService: () => 1, reps: 30, horizon: 30000, warmup: 3000 })
show('\nM/D/1 Wq', d.summary.meanWait.mean, d.summary.meanWait.se, mg1(0.8, 1, 0).meanWait)
// separate-random c=3 -> her biri M/M/1(lambda/3)
const sr = replicate({ lambda: 2.1, servers: 3, layout: 'separate-random', sampleService: exp(1), reps: 30, horizon: 30000, warmup: 3000 })
show('ayrı-rastgele c=3 Wq', sr.summary.meanWait.mean, sr.summary.meanWait.se, mmc(0.7, 1, 1).meanWait)
const sj = replicate({ lambda: 2.1, servers: 3, layout: 'separate-jsq', sampleService: exp(1), reps: 30, horizon: 30000, warmup: 3000 })
const po = replicate({ lambda: 2.1, servers: 3, layout: 'pooled', sampleService: exp(1), reps: 30, horizon: 30000, warmup: 3000 })
console.log(`\nHavuzlama (aynı toplam kapasite, rho=0.7, c=3): ortak=${po.summary.meanWait.mean.toFixed(3)} (teori ${mmc(2.1,1,3).meanWait.toFixed(3)})  ayrı-JSQ=${sj.summary.meanWait.mean.toFixed(3)}  ayrı-rastgele=${sr.summary.meanWait.mean.toFixed(3)}`)
