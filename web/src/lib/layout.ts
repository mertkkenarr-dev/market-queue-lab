export const STORE = { halfW: 7, halfD: 5 }
export const DESK_Z = -1.6
export const QUEUE_GAP = 0.3
export const DOOR = { x: -6.4, z: 4.4 }
export const EXIT = { x: 6.4, z: 4.4 }
export const EXIT_SECONDS = 8

/** Kasalar mağaza genişliğine eşit aralıkla dizilir; sayı değişince konumlar yeniden hesaplanır. */
export function laneX(lane: number, lanes: number): number {
  const span = 9.6
  return lanes === 1 ? 0 : -span / 2 + (span * lane) / (lanes - 1)
}

export function servingPosition(lane: number, lanes: number): { x: number; z: number } {
  return { x: laneX(lane, lanes), z: DESK_Z + 0.6 }
}

/** Ayrı kuyrukta sıra kasanın önünde düz uzar; ortak kuyrukta kasa sayısı kadar sütunluk blok oluşur. */
export function queueSlot(rank: number, lane: number, lanes: number, pooled: boolean): { x: number; z: number } {
  if (pooled) {
    return { x: laneX(rank % lanes, lanes), z: DESK_Z + 1.2 + Math.floor(rank / lanes) * QUEUE_GAP }
  }
  return { x: laneX(lane, lanes), z: DESK_Z + 1.2 + rank * QUEUE_GAP }
}
