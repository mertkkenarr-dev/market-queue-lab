import { readFileSync, writeFileSync } from 'node:fs'
import { parseParams } from '../src/params'
import { Random } from '../src/random'
import { buildChannelSampler, simulateWindow } from '../src/store'

/** Vekil modelin ürettiği personel planını gerçek simülatörde sınar: c* hedefi sağlıyor mu, c*-1 sağlamıyor mu? */
const params = parseParams(JSON.parse(readFileSync('params.json', 'utf8')))
const { target_p90_s: target, plan } = JSON.parse(readFileSync('../ml/staffing_plan.json', 'utf8')) as {
  target_p90_s: number
  plan: { group: string; hour: number; scenario: string; lam_per_hour: number; ctx: string; lanes: number }[]
}
const REPS = 400
const q = (xs: number[], p: number): number => [...xs].sort((a, b) => a - b)[Math.floor(p * (xs.length - 1))] as number

function evaluate(ctx: string, lam: number, lanes: number, seed: number): { meanP90: number; shareMeeting: number } {
  const sampler = buildChannelSampler(params, 'servis', ctx)
  const p90s: number[] = []
  for (let r = 0; r < REPS; r++) {
    p90s.push(simulateWindow(sampler, { rate: lam / 3600, servers: lanes, layout: 'separate-jsq' }, new Random(seed * 7919 + r), r).waitP90)
  }
  const ok = p90s.filter((x) => x <= target).length / REPS
  return { meanP90: p90s.reduce((a, b) => a + b, 0) / REPS, shareMeeting: ok }
}

const out = plan.map((p, i) => {
  const at = evaluate(p.ctx, p.lam_per_hour, p.lanes, i + 1)
  const less = p.lanes > 1 ? evaluate(p.ctx, p.lam_per_hour, p.lanes - 1, i + 1) : null
  return { ...p, sim_p90_at: at.meanP90, sim_ok_at: at.shareMeeting, sim_p90_less: less?.meanP90 ?? null, sim_ok_less: less?.shareMeeting ?? null }
})
writeFileSync('../ml/staffing_verified.json', JSON.stringify(out, null, 1))
const meets = out.filter((o) => o.sim_ok_at >= 0.5).length
const lessFails = out.filter((o) => o.sim_ok_less !== null && o.sim_ok_less < 0.5).length
const withLess = out.filter((o) => o.sim_ok_less !== null).length
console.log(`hücre: ${out.length} | c* hedefi sağlıyor (saatlerin ≥%50'sinde P90≤${target}s): ${meets}/${out.length}`)
console.log(`c*-1 hedefi sağlamıyor: ${lessFails}/${withLess}`)
console.log(`c* altında medyan P90: ${q(out.map((o) => o.sim_p90_at), 0.5).toFixed(0)}s, c*-1 altında: ${q(out.flatMap((o) => (o.sim_p90_less === null ? [] : [o.sim_p90_less])), 0.5).toFixed(0)}s`)
