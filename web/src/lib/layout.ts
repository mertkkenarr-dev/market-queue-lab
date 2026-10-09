import { laneX, QUEUE_START_Z, STORE } from '@sim/geometry'

/**
 * Sahne geometrisi. Kasa hattı, kuyruk başı ve kıvrımlı kuyruk bloğu motorla ortak (`@sim/geometry`):
 * simülasyonun ortak kuyruğa yazdığı yürüme saniyeleri, ekranda çizilen mesafelerden hesaplanır.
 */
export { DESK_Z, laneX, openLanesCenter, QUEUE_START_Z, servingPosition, STORE, TOTAL_LANES } from '@sim/geometry'

export const STORE_DEPTH = STORE.zFront - STORE.zBack
export const STORE_CENTER_Z = (STORE.zFront + STORE.zBack) / 2
export const BELT_LENGTH = 2.2
export const QUEUE_GAP = 1.0
export const DOOR = { x: -9.2, z: STORE.zFront - 1 }
export const EXIT = { x: 9.2, z: STORE.zFront - 1 }
export const EXIT_SECONDS = 8

const SLOTS_PER_COLUMN = Math.floor((STORE.zFront - 0.8 - QUEUE_START_Z) / QUEUE_GAP) + 1
const COLUMN_GAP = 0.95

/**
 * Ayrı kuyrukta sıra kasanın önünde uzar, duvara varınca yandaki sütuna kayar.
 * Kapasite dolunca fazla müşteri son yuvada yığılır: konum asla mağaza dışına çıkmaz
 * (ittirme onları yayar, HUD gerçek sayıyı gösterir). Ortak kuyruk için bkz. serpentine.ts.
 */
export function queueSlot(rank: number, lane: number): { x: number; z: number } {
  const maxColumns = Math.max(1, Math.floor((laneX(lane) - 0.75 + STORE.halfW - 0.7) / COLUMN_GAP) + 1)
  const column = Math.min(Math.floor(rank / SLOTS_PER_COLUMN), maxColumns - 1)
  const row = Math.min(rank - column * SLOTS_PER_COLUMN, SLOTS_PER_COLUMN - 1)
  return { x: laneX(lane) - 0.75 - column * COLUMN_GAP, z: QUEUE_START_Z + row * QUEUE_GAP }
}

