/** Birimler metre. Mağaza 22 x 16 m; kasa hattı arka duvara yakın, kuyruklar müşteri tarafına (+z) uzanır. */
export const STORE = { halfW: 11, halfD: 8 }
export const DESK_Z = -3.4
export const BELT_LENGTH = 2.2
export const QUEUE_START_Z = DESK_Z + 3.0
export const QUEUE_GAP = 1.0
export const DOOR = { x: -9.2, z: 7.0 }
export const EXIT = { x: 9.2, z: 7.0 }
export const EXIT_SECONDS = 8

const LANE_SPAN = 15.6
const SLOTS_PER_COLUMN = Math.floor((STORE.halfD - 0.8 - QUEUE_START_Z) / QUEUE_GAP) + 1
const POOLED_COLUMNS = 6

export function laneX(lane: number, lanes: number): number {
  return lanes === 1 ? 0 : -LANE_SPAN / 2 + (LANE_SPAN * lane) / (lanes - 1)
}

/** Müşteri bandın yanında durur; kasiyer bandın ucunda. */
export function servingPosition(lane: number, lanes: number): { x: number; z: number } {
  return { x: laneX(lane, lanes) - 0.75, z: DESK_Z + 1.5 }
}

/**
 * Ayrı kuyrukta sıra kasanın önünde uzar, mağaza sınırını aşınca yandaki sütuna kayar.
 * Ortak kuyrukta tek bir kıvrımlı blok oluşur ve boşalan kasaya doğru ilerler.
 */
export function queueSlot(rank: number, lane: number, lanes: number, pooled: boolean): { x: number; z: number } {
  if (pooled) {
    const col = rank % POOLED_COLUMNS
    return { x: (col - (POOLED_COLUMNS - 1) / 2) * 0.95, z: QUEUE_START_Z + 0.6 + Math.floor(rank / POOLED_COLUMNS) * QUEUE_GAP }
  }
  const column = Math.floor(rank / SLOTS_PER_COLUMN)
  return { x: laneX(lane, lanes) - 0.75 - column * 0.95, z: QUEUE_START_Z + (rank % SLOTS_PER_COLUMN) * QUEUE_GAP }
}
