import { DESK_Z, QUEUE_START_Z, servingPosition, SNAKE, snakeCenterX } from './geometry'

/**
 * Two costs of a single shared queue that the textbook M/G/c model leaves out.
 *
 * 1. Walk-in. With separate lines the next customer already stands at the belt; that step-up is inside
 *    the changeover measured in the POS data (the source store ran separate lines). From a shared queue
 *    the customer must notice which lane freed and walk there with a cart while the lane sits idle.
 * 2. Slowdown. Wang & Zhou (2018, Management Science 64(7)) observed the same supermarket under both
 *    configurations: with a shared queue checkout times were 6.86% longer net of all channels, which they
 *    attribute to social loafing (no cashier "owns" the line). We apply that net figure to scanning time.
 */
export const POOLED_SLOWDOWN = 0.0686

/** Walking speed pushing a loaded cart (m/s) and the time to notice the freed lane (s). Stated assumptions. */
export const CART_SPEED = 1.0
export const NOTICE_SECONDS = 1.0

export interface FieldEffects {
  /** Charge the walk from the head of the shared queue to the freed lane. */
  walk: boolean
  /** Fractional increase in scan time under a shared queue (0 = textbook). */
  slowdown: number
}

export const TEXTBOOK: FieldEffects = { walk: false, slowdown: 0 }
export const FIELD: FieldEffects = { walk: true, slowdown: POOLED_SLOWDOWN }

/**
 * Extra seconds per called customer for each open lane: the L-shaped path from the queue head to the
 * belt, minus the step-up a separate-line customer makes anyway, at cart speed, plus noticing time.
 */
export function pooledWalkSeconds(lanes: number): number[] {
  const head = { x: snakeCenterX(lanes), z: SNAKE.firstRowZ }
  const stepUp = QUEUE_START_Z - (DESK_Z + 1.5)
  return Array.from({ length: lanes }, (_, s) => {
    const at = servingPosition(s)
    const path = Math.abs(at.x - head.x) + Math.abs(at.z - head.z)
    return Math.max(0, path - stepUp) / CART_SPEED + NOTICE_SECONDS
  })
}

/** Engine options for a layout under the chosen effects (separate lines get none: they are the data's baseline). */
export function layoutOptions(layout: string, lanes: number, fx: FieldEffects): { serviceMultiplier?: number; walkToServer?: number[] } {
  if (layout !== 'pooled') return {}
  return {
    ...(fx.slowdown > 0 ? { serviceMultiplier: 1 + fx.slowdown } : {}),
    ...(fx.walk ? { walkToServer: pooledWalkSeconds(lanes) } : {}),
  }
}
