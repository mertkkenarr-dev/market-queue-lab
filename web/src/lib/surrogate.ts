import { z } from 'zod'

const tree = z.object({
  f: z.array(z.number().int()),
  t: z.array(z.number()),
  l: z.array(z.number().int()),
  r: z.array(z.number().int()),
  v: z.array(z.number()),
})
const target = z.object({ baseline: z.number(), trees: z.array(tree).min(1) })
const schema = z.object({
  features: z.tuple([z.literal('lanes'), z.literal('pooled'), z.literal('rho'), z.literal('mean_occupancy')]),
  targets: z.object({ wait_mean: target, wait_p90: target, p_wait: target }),
})

export type SurrogateModel = z.infer<typeof schema>
type Tree = z.infer<typeof tree>

/** Dışa aktarılan ağaç dosyası bozuksa sessizce yanlış tahmin yerine hata verir. */
export function parseSurrogate(raw: unknown): SurrogateModel {
  const r = schema.safeParse(raw)
  if (!r.success) throw new Error(`Geçersiz vekil model dosyası: ${r.error.issues[0]?.path.join('.')}: ${r.error.issues[0]?.message}`)
  for (const t of Object.values(r.data.targets)) {
    for (const tr of t.trees) {
      const n = tr.f.length
      if (tr.t.length !== n || tr.l.length !== n || tr.r.length !== n || tr.v.length !== n) throw new Error('Geçersiz vekil model: ağaç dizileri uyumsuz')
    }
  }
  return r.data
}

/** sklearn HistGradientBoosting kuralı: x[özellik] <= eşik ise sola, değilse sağa; yapraklarda özellik = -1. */
function evaluate(t: { baseline: number; trees: readonly Tree[] }, x: readonly number[]): number {
  let sum = t.baseline
  for (const tr of t.trees) {
    let i = 0
    while ((tr.f[i] as number) >= 0) i = x[tr.f[i] as number]! <= (tr.t[i] as number) ? (tr.l[i] as number) : (tr.r[i] as number)
    sum += tr.v[i] as number
  }
  return sum
}

export interface SurrogateInput {
  lanes: number
  pooled: boolean
  /** Yük oranı ρ = λ·E[meşguliyet] / (c·3600). */
  rho: number
  /** Müşteri başına ortalama kasa meşguliyeti: tarama + geçiş (sn). */
  meanOccupancy: number
}

export interface SurrogateOutput {
  meanWait: number
  waitP90: number
  probWait: number
}

export function predict(m: SurrogateModel, i: SurrogateInput): SurrogateOutput {
  const x = [i.lanes, i.pooled ? 1 : 0, i.rho, i.meanOccupancy]
  return {
    meanWait: Math.expm1(evaluate(m.targets.wait_mean, x)),
    waitP90: Math.expm1(evaluate(m.targets.wait_p90, x)),
    probWait: Math.min(1, Math.max(0, evaluate(m.targets.p_wait, x))),
  }
}

/** Eğitim aralığı: bunun dışında vekil güvenilmez (ρ>1,05 ya da 10'dan fazla kasa). */
export const SURROGATE_LIMITS = { maxRho: 1.05, maxLanes: 10 } as const
