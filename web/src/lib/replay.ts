import type { Journey, LayoutKind, ReplayStats } from '../types/scenario'
import { DOOR, EXIT, EXIT_SECONDS, queueSlot, servingPosition } from './layout'

export const HIDDEN = 0
export const WAITING = 1
export const SERVING = 2
export const LEAVING = 3

export interface AgentBuffers {
  tx: Float32Array
  tz: Float32Array
  state: Uint8Array
  waited: Float32Array
  /** Kuyruktaki sıra (bekleyenler için); sıra ilerleme gecikmesi buna göre. */
  rank: Uint16Array
}

export function makeBuffers(n: number): AgentBuffers {
  return { tx: new Float32Array(n), tz: new Float32Array(n), state: new Uint8Array(n), waited: new Float32Array(n), rank: new Uint16Array(n) }
}

/**
 * Motor izinden t anındaki hedef konumları üretir. Yolculuklar varış sırasına göredir,
 * bu yüzden sıra numarası tek geçişte ve ilk gelecek müşteride durarak bulunur (O(görünen)).
 * Düzgün hareket çizim tarafında sönümlemeyle yapılır; burada yalnızca "nerede olmalı" hesaplanır.
 */
export function frameAt(journeys: readonly Journey[], t: number, layout: LayoutKind, lanes: number, out: AgentBuffers): ReplayStats {
  const pooled = layout === 'pooled'
  const queueCounts = new Int32Array(pooled ? 1 : lanes)
  let waiting = 0
  let serving = 0
  let done = 0
  let waitSum = 0
  const laneServing = new Uint8Array(lanes)
  let started = 0
  out.state.fill(HIDDEN)
  out.rank.fill(0)
  for (let i = 0; i < journeys.length; i++) {
    const j = journeys[i] as Journey
    if (t < j.arrival) break
    if (t >= j.start) {
      started++
      waitSum += j.start - j.arrival
    }
    if (t >= j.called && t < j.start) {
      // Ortak kuyruktan çağrıldı, kasaya yürüyor: kuyrukta değil, kasa onun için tutuluyor.
      const pos = servingPosition(j.lane)
      out.tx[i] = pos.x
      out.tz[i] = pos.z
      out.state[i] = SERVING
      out.waited[i] = t - j.arrival
      serving++
      laneServing[j.lane] = 1
    } else if (t < j.start) {
      const q = pooled ? 0 : j.lane
      const rank = queueCounts[q] as number
      queueCounts[q] = rank + 1
      // Ortak kuyrukta konumu kıvrımlı yol belirler (yalnızca sıra numarası gerekir); ayrı kuyrukta sabit yuva.
      const slot = pooled ? { x: 0, z: 0 } : queueSlot(rank, j.lane)
      out.tx[i] = slot.x
      out.tz[i] = slot.z
      out.state[i] = WAITING
      out.waited[i] = t - j.arrival
      out.rank[i] = rank
      waiting++
    } else if (t < j.end) {
      const pos = servingPosition(j.lane)
      out.tx[i] = pos.x
      out.tz[i] = pos.z
      out.state[i] = SERVING
      out.waited[i] = j.start - j.arrival
      serving++
      laneServing[j.lane] = 1
    } else {
      done++
      if (t < j.end + EXIT_SECONDS) {
        out.tx[i] = EXIT.x
        out.tz[i] = EXIT.z
        out.state[i] = LEAVING
        out.waited[i] = j.start - j.arrival
      }
    }
  }
  return { waiting, serving, done, meanWaitStarted: started ? waitSum / started : 0, laneServing }
}

export { DOOR }
