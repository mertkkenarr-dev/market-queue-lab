import { readFileSync, writeFileSync } from 'node:fs'
import { simulate } from '../src/engine'
import { FIELD, layoutOptions, TEXTBOOK, type FieldEffects } from '../src/field'
import { parseParams } from '../src/params'
import { Random } from '../src/random'
import { summarize } from '../src/stats'
import { basketContext, buildChannelSampler, expectedChangeover, expectedService, streamForInterval } from '../src/store'

/**
 * Shared vs separate queues across load, on identical customer streams (common random numbers):
 * the textbook model against the model with walk-in and slowdown. Output feeds the story page.
 */
const params = parseParams(JSON.parse(readFileSync(process.argv[2] ?? 'params.json', 'utf8')))
const out = process.argv[3] ?? '../docs/field_effect.json'
const REPS = 200
const WARM = 1800
const HOUR = 3600
const ctx = basketContext('fri', 17)
const sampler = buildChannelSampler(params, 'servis', ctx)
const occupancy = expectedService(params, 'servis', ctx) + expectedChangeover(params, 'servis', ctx)

function run(lanes: number, rho: number, layout: 'pooled' | 'separate-jsq', fx: FieldEffects, rep: number) {
  const rate = (rho * lanes) / occupancy
  const rng = new Random(90_001 * lanes + Math.round(rho * 1000) * 131 + rep)
  const warm = streamForInterval(sampler, rng, 0, WARM, rate)
  const meas = streamForInterval(sampler, rng, WARM, WARM + HOUR, rate)
  const customers = [...warm.customers, ...meas.customers].map((c, i) => ({ ...c, id: i }))
  return simulate(customers, { servers: lanes, layout, warmup: WARM, horizon: WARM + HOUR, routingSeed: rep, ...layoutOptions(layout, lanes, fx) })
}

/** Mean paired difference (pooled - separate) in mean wait for a given effect set. */
function meanDiff(lanes: number, rho: number, fx: FieldEffects, sep: number[]): number {
  let d = 0
  for (let r = 0; r < REPS; r++) d += run(lanes, rho, 'pooled', fx, r).meanWait - (sep[r] as number)
  return d / REPS
}

/** Slowdown at which the shared queue stops winning (walk-in included); bisection on common random numbers. */
function breakEven(lanes: number, rho: number, sep: number[]): number {
  let lo = 0
  let hi = 0.2
  if (meanDiff(lanes, rho, { walk: true, slowdown: 0 }, sep) >= 0) return 0
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2
    if (meanDiff(lanes, rho, { walk: true, slowdown: mid }, sep) < 0) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

const rows = []
for (const lanes of [3, 5, 8]) {
  for (let rho = 0.5; rho <= 0.951; rho += 0.05) {
    const diff = { textbook: [] as number[], field: [] as number[] }
    const p90 = { textbook: [] as number[], field: [] as number[] }
    const sep: number[] = []
    for (let r = 0; r < REPS; r++) {
      const s = run(lanes, rho, 'separate-jsq', TEXTBOOK, r)
      sep.push(s.meanWait)
      for (const [k, fx] of [['textbook', TEXTBOOK], ['field', FIELD]] as const) {
        const p = run(lanes, rho, 'pooled', fx, r)
        diff[k].push(p.meanWait - s.meanWait)
        p90[k].push(p.waitP90 - s.waitP90)
      }
    }
    const walkOnly = meanDiff(lanes, rho, { walk: true, slowdown: 0 }, sep)
    const row = {
      lanes, rho: +rho.toFixed(2), separateWait: summarize(sep).mean, walkOnly, breakEvenSlowdown: breakEven(lanes, rho, sep),
      textbook: summarize(diff.textbook), field: summarize(diff.field),
      textbookP90: summarize(p90.textbook).mean, fieldP90: summarize(p90.field).mean,
    }
    rows.push(row)
    console.log(lanes, row.rho, row.separateWait.toFixed(1), row.textbook.mean.toFixed(1), walkOnly.toFixed(1), row.field.mean.toFixed(1), `be=${(100 * row.breakEvenSlowdown).toFixed(1)}%`)
  }
}
writeFileSync(out, JSON.stringify({ context: 'fri|pm', reps: REPS, occupancySeconds: occupancy, rows }, null, 1))
