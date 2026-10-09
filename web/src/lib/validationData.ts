import { z } from 'zod'

const tuple4 = z.tuple([z.number(), z.number(), z.number(), z.number()])
const foldMetric = z.object({ mode: z.string(), n: z.number(), bias_pct: z.number(), mape_pct: z.number(), coverage_pct: z.number() })
const triple = z.object({ bias: z.number(), mape: z.number(), coverage: z.number() })

const schema = z.object({
  scatter: z.object({ serviceMean: z.array(tuple4), utilization: z.array(tuple4), count: z.array(tuple4), basket: z.array(tuple4) }),
  holdout: z.record(z.string(), z.record(z.string(), foldMetric)),
  recalibration: z.record(z.string(), z.record(z.string(), z.object({ stale: triple, fresh: triple, n: z.number() }))),
  arrival: z.record(z.string(), z.object({
    methods: z.record(z.string(), z.object({ mape: z.number(), bias: z.number(), poisson_deviance: z.number() })),
    last_period_scale: z.number(),
  })),
  surrogate: z.object({
    by_rho: z.array(z.object({ rho: z.string(), n: z.number(), sim_noise: z.number(), surrogate_mae: z.number(), erlang_c_mae: z.number() })),
    r2: z.record(z.string(), z.number()),
  }),
  theory: z.record(z.string(), z.array(z.object({ rho: z.number(), theory: z.number(), sim: z.number(), lo: z.number(), hi: z.number() }))),
})

export type ValidationData = z.infer<typeof schema>
export type Tuple4 = z.infer<typeof tuple4>

export type ValidationState = { status: 'ok'; data: ValidationData } | { status: 'error'; message: string }

/** Dosya bozuksa sayfa çökmez; hangi alanın bozuk olduğu söylenir. */
export function parseValidation(raw: unknown): ValidationState {
  const r = schema.safeParse(raw)
  if (r.success) return { status: 'ok', data: r.data }
  const i = r.error.issues[0]
  return { status: 'error', message: `${i?.path.join('.')}: ${i?.message}` }
}

export interface ScatterStats {
  n: number
  /** Simülasyon medyanı − gerçek, gerçeğe oranla ortalama (%). */
  biasPct: number
  mapePct: number
  /** Gerçeğin %90 simülasyon aralığında kaldığı pencere payı (%). */
  coveragePct: number
}

export function scatterStats(rows: readonly Tuple4[]): ScatterStats {
  const usable = rows.filter(([real]) => real > 0)
  const n = usable.length
  if (n === 0) return { n: 0, biasPct: 0, mapePct: 0, coveragePct: 0 }
  let bias = 0
  let mape = 0
  let covered = 0
  for (const [real, lo, med, hi] of usable) {
    bias += (med - real) / real
    mape += Math.abs(med - real) / real
    if (real >= lo && real <= hi) covered++
  }
  return { n, biasPct: (100 * bias) / n, mapePct: (100 * mape) / n, coveragePct: (100 * covered) / n }
}

/** Teoriden en büyük bağıl sapma (%), tüm kasa sayıları ve yük oranları üzerinde. */
export function worstTheoryGapPct(theory: ValidationData['theory']): number {
  let worst = 0
  for (const rows of Object.values(theory)) for (const r of rows) if (r.theory > 0) worst = Math.max(worst, (100 * Math.abs(r.sim - r.theory)) / r.theory)
  return worst
}
