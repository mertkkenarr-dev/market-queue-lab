import { readFileSync, writeFileSync } from 'node:fs'
import { parseParams } from '../src/params'
import { Random } from '../src/random'
import { quantileSorted } from '../src/stats'
import { basketContext, buildChannelSampler, expectedService, selfServiceShare, simulateWindow, type WindowResult } from '../src/store'

interface Win {
  day: string; dow_group: string; hour: number
  service_lanes: number; service_lanes_proxy15: number; service_lanes_spread: number; self_machines: number; stable: boolean
  n_service: number; n_self: number
  basket_mean_service: number; basket_mean_self: number | null
  tran_mean_service: number; tran_mean_self: number | null
  util_service: number; util_self: number | null
  gap_short_service: number | null; gap_median_service: number | null
}
type Scored = WindowResult & { gapShort: number; gapMedian: number }
const REPS = 300
function arg(name: string): string {
  const i = process.argv.indexOf(`--${name}`)
  const v = i >= 0 ? process.argv[i + 1] : undefined
  if (!v) throw new Error(`eksik argüman --${name}`)
  return v
}
const params = parseParams(JSON.parse(readFileSync(arg('params'), 'utf8')))
const windowsFile = JSON.parse(readFileSync(arg('windows'), 'utf8')) as { period: string; gap_short_seconds: number; gap_hist_service: number[]; windows: Win[] }
const GAP_SHORT = windowsFile.gap_short_seconds
const gapHist = new Float64Array(windowsFile.gap_hist_service.length)
if (params.train_periods.includes(windowsFile.period)) {
  throw new Error(`SIZINTI: ${windowsFile.period} eğitim dönemlerinde (${params.train_periods.join(', ')}). Durduruldu.`)
}


const useContext = !process.argv.includes('--no-context')

/**
 * Recalibration experiment: the first N days of the test period act as a small fresh sample from which only
 * two scalars per channel are learned (service-speed ratio, traffic ratio). Evaluation uses the remaining days,
 * so calibration and scoring windows never overlap.
 */
const calibIdx = process.argv.indexOf('--calib-days')
const calibDays = calibIdx >= 0 ? Number(process.argv[calibIdx + 1]) : 0
const recalibrate = calibDays > 0 && !process.argv.includes('--no-recal')
const allWindows = windowsFile.windows
const dayList = [...new Set(allWindows.map((w) => w.day))].sort()
const calibSet = new Set(dayList.slice(0, calibDays))
const calibWindows = allWindows.filter((w) => calibSet.has(w.day))
const windows = calibDays > 0 ? allWindows.filter((w) => !calibSet.has(w.day)) : allWindows
const scales = { serviceV: 1, serviceS: 1, trafficV: 1, trafficS: 1 }
if (recalibrate) {
  let numV = 0, denV = 0, numS = 0, denS = 0, cntV = 0, expV = 0, cntS = 0, expS = 0
  for (const w of calibWindows) {
    const ctx = useContext ? basketContext(w.dow_group, w.hour) : undefined
    numV += w.n_service * w.tran_mean_service
    denV += w.n_service * expectedService(params, 'servis', ctx)
    if (w.n_self > 0 && w.tran_mean_self !== null) {
      numS += w.n_self * w.tran_mean_self
      denS += w.n_self * expectedService(params, 'self-servis', ctx)
    }
    const lam = params.arrival_profile.per_second_by_group_hour[w.dow_group]?.[String(w.hour)] ?? 0
    const sh = selfServiceShare(params, w.hour)
    cntV += w.n_service; expV += (1 - sh) * lam * 3600
    cntS += w.n_self; expS += sh * lam * 3600
  }
  scales.serviceV = numV / denV; scales.serviceS = denS > 0 ? numS / denS : 1
  scales.trafficV = cntV / expV; scales.trafficS = expS > 0 ? cntS / expS : 1
  console.log('Kalibrasyon ölçekleri:', Object.fromEntries(Object.entries(scales).map(([k, v]) => [k, +v.toFixed(3)])))
}
const samplerCache = new Map<string, ReturnType<typeof buildChannelSampler>>()
function samplerFor(channel: 'servis' | 'self-servis', w: Win) {
  const ctx = useContext ? basketContext(w.dow_group, w.hour) : undefined
  const key = `${channel}|${ctx}`
  let s = samplerCache.get(key)
  if (!s) samplerCache.set(key, (s = buildChannelSampler(params, channel, ctx, { serviceScale: channel === 'servis' ? scales.serviceV : scales.serviceS })))
  return s
}
const sigma = params.arrival_profile.sigma_day
type Metric = 'count' | 'basketMean' | 'serviceMean' | 'utilization' | 'occupancy' | 'meanWait' | 'waitP90' | 'probWait' | 'gapShort' | 'gapMedian'
const METRICS: Metric[] = ['count', 'basketMean', 'serviceMean', 'utilization', 'occupancy', 'meanWait', 'waitP90', 'probWait', 'gapShort', 'gapMedian']

/** Cashier-gap summaries; the observed-mode service lanes also feed the pooled gap histogram. */
function score(r: WindowResult, histogram: boolean): Scored {
  const g = r.gaps ?? []
  const sorted = Float64Array.from(g).sort()
  if (histogram) for (const v of g) gapHist[Math.min(gapHist.length - 1, Math.max(0, Math.floor(v)))]! += 1
  return { ...r, gaps: undefined, gapShort: g.length ? g.filter((v) => v <= GAP_SHORT).length / g.length : Number.NaN, gapMedian: quantileSorted(sorted, 0.5) }
}

function summarizeReps(rows: Scored[]): Record<Metric, { p05: number; p50: number; p95: number; mean: number }> {
  const out = {} as Record<Metric, { p05: number; p50: number; p95: number; mean: number }>
  for (const m of METRICS) {
    const v = Float64Array.from(rows.map((r) => r[m]).filter((x) => Number.isFinite(x))).sort()
    out[m] = { p05: quantileSorted(v, 0.05), p50: quantileSorted(v, 0.5), p95: quantileSorted(v, 0.95), mean: v.reduce((a, b) => a + b, 0) / (v.length || 1) }
  }
  return out
}

const results = windows.map((w, wi) => {
  // Fractional open lanes (time-weighted) become an integer per replication by unbiased random rounding,
  // so the average simulated capacity equals the measured one instead of being rounded up or down.
  const laneRng = new Random(424_243 * (wi + 1))
  const laneDraws = Array.from({ length: REPS }, () => Math.max(1, Math.floor(w.service_lanes) + (laneRng.bernoulli(w.service_lanes % 1) ? 1 : 0)))
  const lanes = Math.max(1, Math.round(w.service_lanes))
  const machines = Math.max(1, Math.round(w.self_machines))
  const profile = params.arrival_profile.per_second_by_group_hour[w.dow_group]?.[String(w.hour)] ?? 0
  const share = selfServiceShare(params, w.hour)
  const modes: Record<'observed' | 'predicted', { servis: Scored[]; self: Scored[] }> = {
    observed: { servis: [], self: [] }, predicted: { servis: [], self: [] },
  }
  for (let r = 0; r < REPS; r++) {
    for (const [mi, mode] of (['observed', 'predicted'] as const).entries()) {
      const rng = new Random(1_000_003 * (wi + 1) + 7919 * (mi + 1) + r)
      let rateV: number, rateS: number, fixedV: number | undefined, fixedS: number | undefined
      if (mode === 'observed') {
        rateV = w.n_service / 3600; rateS = w.n_self / 3600; fixedV = w.n_service; fixedS = w.n_self
      } else {
        const lam = profile * Math.exp(sigma * rng.normal() - (sigma * sigma) / 2)
        rateV = (1 - share) * lam * scales.trafficV; rateS = share * lam * scales.trafficS
      }
      const gaps = mode === 'observed'
      modes[mode].servis.push(score(simulateWindow(samplerFor('servis', w), { rate: rateV, fixedCount: fixedV, servers: laneDraws[r] as number, layout: 'separate-jsq', gaps }, rng, r), gaps))
      if (rateS > 0 || (fixedS ?? 0) > 0) {
        modes[mode].self.push(score(simulateWindow(samplerFor('self-servis', w), { rate: rateS, fixedCount: fixedS, servers: machines, layout: 'pooled' }, rng, r + 31), false))
      }
    }
  }
  return {
    ...w, lanes_used: lanes, machines_used: machines,
    observed: { servis: summarizeReps(modes.observed.servis), self: modes.observed.self.length ? summarizeReps(modes.observed.self) : null },
    predicted: { servis: summarizeReps(modes.predicted.servis), self: modes.predicted.self.length ? summarizeReps(modes.predicted.self) : null },
  }
})
writeFileSync(arg('out'), JSON.stringify({
  meta: { train_periods: params.train_periods, test_period: windowsFile.period, reps: REPS, sigma_day: sigma, basket_context: useContext, calib_days: calibDays, recalibrated: recalibrate, scales,
          note: 'observed: gözlenen müşteri sayısına koşullu; predicted: yalnızca eğitim profili + gün çarpanı. Kasa sayısı iki modda da gözlenen (personel kararı girdidir).' },
  gap_short_seconds: GAP_SHORT,
  gap_hist: { real: windowsFile.gap_hist_service, sim: Array.from(gapHist, (v) => v / REPS) },
  windows: results,
}))
console.log(`Yazıldı: ${results.length} pencere x 2 mod x ${REPS} tekrar`)
