import { z } from 'zod'

const serviceModel = z.object({
  a: z.number().nonnegative(),
  card_extra: z.number(),
  b: z.number().positive(),
  gamma: z.number().min(0.3).max(1.5),
  v0: z.number().nonnegative(),
  v1: z.number().nonnegative(),
})

const pmf600 = z.array(z.number().nonnegative()).length(600)

const joint = z.object({
  pmf_items_x_card: pmf600,
  card_share: z.number().min(0).max(1),
  n: z.number().int().positive(),
  by_context: z.record(z.string(), z.object({ pmf_items_x_card: pmf600, n: z.number().int().positive() })).optional(),
})

const paramsSchema = z.object({
  train_periods: z.array(z.string()).min(1),
  holdout_periods: z.array(z.string()),
  service: z.object({ servis: serviceModel, 'self-servis': serviceModel }),
  channel: z.object({
    self_service_share: z.number().min(0).max(1),
    share_by_hour: z.record(z.string(), z.number().min(0).max(1)),
    joint: z.object({ servis: joint, 'self-servis': joint }),
  }),
  arrival_profile: z.object({
    per_second_by_group_hour: z.record(z.string(), z.record(z.string(), z.number().nonnegative())),
    sigma_day: z.number().nonnegative(),
  }),
})

export type StoreParams = z.infer<typeof paramsSchema>
export type ServiceModel = z.infer<typeof serviceModel>
export type Channel = 'servis' | 'self-servis'

/** Runtime validation at the file boundary: a malformed parameter file must fail loudly, not simulate nonsense. */
export function parseParams(raw: unknown): StoreParams {
  const result = paramsSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`Invalid store params: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  }
  return result.data
}
