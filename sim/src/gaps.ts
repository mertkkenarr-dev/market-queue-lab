import type { TraceRecord } from './engine'

/**
 * Cashier gaps: time from the end of one scan to the start of the next scan on the same lane.
 * This is the only queue-dependent quantity the POS data records (BreakTime): with someone already
 * waiting the gap is just the changeover; with an empty lane it also contains idle time.
 * Only gaps that follow a scan started inside [from, to) are kept, mirroring the data windows.
 */
export function laneGaps(trace: readonly TraceRecord[], lanes: number, from: number, to: number): number[] {
  const byLane: TraceRecord[][] = Array.from({ length: lanes }, () => [])
  for (const r of trace) (byLane[r.server] as TraceRecord[]).push(r)
  const gaps: number[] = []
  for (const rows of byLane) {
    rows.sort((a, b) => a.start - b.start)
    for (let i = 0; i + 1 < rows.length; i++) {
      const prev = rows[i] as TraceRecord
      if (prev.start < from || prev.start >= to) continue
      gaps.push((rows[i + 1] as TraceRecord).start - prev.scanEnd)
    }
  }
  return gaps
}
