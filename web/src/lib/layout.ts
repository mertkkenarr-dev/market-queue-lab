/** Birimler metre. Mağaza 22 x 16 m; kasa hattı arka duvara yakın, kuyruklar müşteri tarafına (+z) uzanır. */
export const STORE = { halfW: 11, halfD: 8 }
export const DESK_Z = -3.4
export const BELT_LENGTH = 2.2
export const QUEUE_START_Z = DESK_Z + 3.0
export const QUEUE_GAP = 1.0
export const DOOR = { x: -9.2, z: 7.0 }
export const EXIT = { x: 9.2, z: 7.0 }
export const EXIT_SECONDS = 8

/** Mağazada sabit 10 fiziksel kasa var; açık olanlar soldan (girişe en yakın) başlar, kalanlar kapalı durur. */
export const TOTAL_LANES = 10
const LANE_SPAN = 15.6
const SLOTS_PER_COLUMN = Math.floor((STORE.halfD - 0.8 - QUEUE_START_Z) / QUEUE_GAP) + 1
const COLUMN_GAP = 0.95
export const POOLED_COLUMNS = 6
const POOLED_ROWS = Math.floor((STORE.halfD - 0.6 - (QUEUE_START_Z + 0.6)) / QUEUE_GAP) + 1
const POOLED_EXTRA_COLUMNS = 4

export function laneX(lane: number): number {
  return -LANE_SPAN / 2 + (LANE_SPAN * lane) / (TOTAL_LANES - 1)
}

/** Açık kasaların yatay ortası: ortak kuyruk bloğu ve bariyeri buraya kurulur. */
export function openLanesCenter(lanes: number): number {
  return (laneX(0) + laneX(Math.max(0, lanes - 1))) / 2
}

/** Müşteri bandın yanında durur; kasiyer bandın ucunda. */
export function servingPosition(lane: number): { x: number; z: number } {
  return { x: laneX(lane) - 0.75, z: DESK_Z + 1.5 }
}

/**
 * Ayrı kuyrukta sıra kasanın önünde uzar, duvara varınca yandaki sütuna kayar.
 * Ortak kuyrukta önce bariyerli blok (6 sütun) dolar, sonra yan sütunlara taşar.
 * Kapasite dolunca fazla müşteri son yuvada yığılır: konum asla mağaza dışına çıkmaz
 * (ittirme onları yayar, HUD gerçek sayıyı gösterir).
 */
export function queueSlot(rank: number, lane: number, lanes: number, pooled: boolean): { x: number; z: number } {
  if (pooled) {
    const capacity = POOLED_COLUMNS * POOLED_ROWS
    let col: number
    let row: number
    if (rank < capacity) {
      col = rank % POOLED_COLUMNS
      row = Math.floor(rank / POOLED_COLUMNS)
    } else {
      const extra = Math.min(rank - capacity, POOLED_EXTRA_COLUMNS * POOLED_ROWS - 1)
      col = POOLED_COLUMNS + Math.floor(extra / POOLED_ROWS)
      row = extra % POOLED_ROWS
    }
    const x = openLanesCenter(lanes) + (col - (POOLED_COLUMNS - 1) / 2) * COLUMN_GAP
    return { x: Math.min(STORE.halfW - 0.6, Math.max(-STORE.halfW + 0.6, x)), z: QUEUE_START_Z + 0.6 + row * QUEUE_GAP }
  }
  const maxColumns = Math.max(1, Math.floor((laneX(lane) - 0.75 + STORE.halfW - 0.7) / COLUMN_GAP) + 1)
  const column = Math.min(Math.floor(rank / SLOTS_PER_COLUMN), maxColumns - 1)
  const row = Math.min(rank - column * SLOTS_PER_COLUMN, SLOTS_PER_COLUMN - 1)
  return { x: laneX(lane) - 0.75 - column * COLUMN_GAP, z: QUEUE_START_Z + row * QUEUE_GAP }
}
