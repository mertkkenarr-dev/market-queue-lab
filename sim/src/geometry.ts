/**
 * Store floor plan in metres, shared by the 3D scene (web/) and the walking-time model below, so the
 * seconds charged in the simulation are the distances drawn on screen. The store is 22 x 21 m; the
 * checkout line sits near the back wall and queues extend toward the customer side (+z).
 */
export const STORE = { halfW: 11, zBack: -8, zFront: 13 }
export const DESK_Z = -3.4
export const QUEUE_START_Z = DESK_Z + 3.0
/** The store has 10 physical checkouts; open ones start from the left (nearest the entrance). */
export const TOTAL_LANES = 10
const LANE_SPAN = 15.6

export function laneX(lane: number): number {
  return -LANE_SPAN / 2 + (LANE_SPAN * lane) / (TOTAL_LANES - 1)
}

/** Customer stands beside the belt; the cashier sits at its end. */
export function servingPosition(lane: number): { x: number; z: number } {
  return { x: laneX(lane) - 0.75, z: DESK_Z + 1.5 }
}

/** Serpentine (shared queue) block: its head sits in the middle of row 0, centred on the open lanes. */
export const SNAKE = { rowWidth: 6.5, rowSpacing: 1.5, minRows: 2, maxRows: 8, gate: 1.2, sidePad: 0.6, firstRowZ: DESK_Z + 3.6 }

export function openLanesCenter(lanes: number): number {
  return (laneX(0) + laneX(Math.max(0, lanes - 1))) / 2
}

/** The block is pushed inward so its gates and tapes stay inside the walls. */
export function snakeCenterX(lanes: number): number {
  const half = SNAKE.rowWidth / 2
  const lo = -STORE.halfW + 0.8 + half + SNAKE.gate
  const hi = STORE.halfW - 0.8 - half - SNAKE.gate
  return Math.min(hi, Math.max(lo, openLanesCenter(lanes)))
}
