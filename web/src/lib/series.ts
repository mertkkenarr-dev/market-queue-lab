import type { Journey } from '../types/scenario'

export interface WaitingSeries {
  step: number
  waiting: Uint16Array
  peak: number
}

/** Her `step` saniyede kuyrukta bekleyen sayısı: varışı yapmış, hizmeti henüz başlamamış müşteriler. */
export function waitingSeries(journeys: readonly Journey[], endTime: number, step = 15): WaitingSeries {
  const k = Math.floor(endTime / step) + 1
  const waiting = new Uint16Array(k)
  let peak = 0
  for (let i = 0; i < k; i++) {
    const t = i * step
    let w = 0
    for (const j of journeys) {
      if (j.arrival > t) break
      if (t < j.start) w++
    }
    waiting[i] = w
    if (w > peak) peak = w
  }
  return { step, waiting, peak }
}
