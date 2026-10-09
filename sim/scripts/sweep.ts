import { readFileSync, writeFileSync } from 'node:fs'
import { parseParams } from '../src/params'
import { Random } from '../src/random'
import { basketContext, buildChannelSampler, expectedService, simulateWindow } from '../src/store'

/**
 * Senaryo süpürmesi: vekil modelin eğitim/test verisi. Yük oranı ρ düzgün dağıtılır
 * (λ üzerinde düzgün değil), çünkü bekleme ρ→1 civarında patlar ve bu bölge en çok örnek ister.
 */
function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`)
  const v = i >= 0 ? process.argv[i + 1] : fallback
  if (v === undefined) throw new Error(`eksik argüman --${name}`)
  return v
}
const params = parseParams(JSON.parse(readFileSync(arg('params'), 'utf8')))
const N = Number(arg('n', '8000'))
const REPS = Number(arg('reps', '12'))
const seed = Number(arg('seed', '1'))
const contexts = ['mon_thu', 'fri', 'sat', 'sun'].flatMap((g) => [8, 18].map((h) => basketContext(g, h)))
const rng = new Random(seed)
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length
const sd = (xs: number[]): number => {
  const m = mean(xs)
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1))
}

const rows: string[] = ['ctx,lanes,layout,scale,mean_service,lam_per_hour,rho,wait_mean,wait_mean_sd,p_wait,wait_p90']
for (let i = 0; i < N; i++) {
  const ctx = contexts[rng.int(contexts.length)] as string
  const lanes = 1 + rng.int(10)
  const layout = rng.uniform() < 0.5 ? 'separate-jsq' : 'pooled'
  const scale = 0.8 + 0.45 * rng.uniform()
  const rho = 0.2 + 0.85 * rng.uniform()
  const meanService = expectedService(params, 'servis', ctx) * scale
  const lam = (rho * lanes * 3600) / meanService
  const sampler = buildChannelSampler(params, 'servis', ctx, { serviceScale: scale })
  const w: number[] = [], pw: number[] = [], p90: number[] = []
  for (let r = 0; r < REPS; r++) {
    const res = simulateWindow(sampler, { rate: lam / 3600, servers: lanes, layout: layout as 'pooled' | 'separate-jsq' }, new Random(seed * 1_000_003 + i * 97 + r), r)
    w.push(res.meanWait); pw.push(res.probWait); p90.push(res.waitP90)
  }
  rows.push([ctx, lanes, layout, scale.toFixed(4), meanService.toFixed(3), lam.toFixed(2), rho.toFixed(4), mean(w).toFixed(3), sd(w).toFixed(3), mean(pw).toFixed(4), mean(p90).toFixed(3)].join(','))
}
writeFileSync(arg('out'), rows.join('\n') + '\n')
console.log(`Yazıldı: ${N} senaryo x ${REPS} tekrar -> ${arg('out')}`)
