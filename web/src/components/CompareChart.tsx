import { useEffect, useState } from 'react'
import type { ClockRef } from '../hooks/usePlayback'
import { LAYOUT_SHORT, LAYOUTS } from '../lib/layoutNames'
import type { WaitingSeries } from '../lib/series'
import type { LayoutKind } from '../types/scenario'

interface Props {
  series: Record<LayoutKind, WaitingSeries>
  hour: number
  endTime: number
  clock: ClockRef
}

const W = 720
const H = 240
const M = { l: 44, r: 150, t: 16, b: 32 }
const clockLabel = (hour: number, t: number): string => {
  const total = hour * 60 + Math.round(t / 60)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Üç düzenin kuyruk uzunluğu, aynı müşteri akışında. Dikey çizgi oynatma anıdır. */
export function CompareChart({ series, hour, endTime, clock }: Props) {
  const [t, setT] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setT(clock.current.t), 100)
    return () => window.clearInterval(id)
  }, [clock])

  const peak = Math.max(...LAYOUTS.map((k) => series[k].peak))
  const yMax = Math.max(5, Math.ceil(peak / 5) * 5)
  const x = (sec: number): number => M.l + (sec / endTime) * (W - M.l - M.r)
  const y = (v: number): number => H - M.b - (v / yMax) * (H - M.t - M.b)
  const line = (s: WaitingSeries): string => Array.from(s.waiting, (v, i) => `${x(i * s.step).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const at = (s: WaitingSeries): number => s.waiting[Math.min(s.waiting.length - 1, Math.floor(t / s.step))] ?? 0
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * Math.min(endTime, 3600))
  const label = `Kuyrukta bekleyen sayısı. Zirve: ${LAYOUTS.map((k) => `${LAYOUT_SHORT[k]} ${series[k].peak}`).join(', ')}.`

  return (
    <figure className="chart">
      <figcaption>Kuyruktaki kişi sayısı, saat boyunca</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={M.l} x2={W - M.r} y1={y(f * yMax)} y2={y(f * yMax)} className="grid" />
            <text x={M.l - 8} y={y(f * yMax) + 4} textAnchor="end" className="num axis">{Math.round(f * yMax)}</text>
          </g>
        ))}
        {ticks.map((sec) => (
          <text key={sec} x={x(sec)} y={H - 8} textAnchor="middle" className="num axis">{clockLabel(hour, sec)}</text>
        ))}
        {LAYOUTS.map((k) => <polyline key={k} points={line(series[k])} className={`series ${k}`} />)}
        <line x1={x(t)} x2={x(t)} y1={M.t} y2={H - M.b} className="playhead" />
        {LAYOUTS.map((k) => <circle key={k} cx={x(t)} cy={y(at(series[k]))} r="4" className={`dot ${k}`} />)}
        <g transform={`translate(${W - M.r + 14}, ${M.t + 8})`}>
          {LAYOUTS.map((k, i) => (
            <g key={k} transform={`translate(0, ${i * 22})`}>
              <line x1="0" x2="24" y1="0" y2="0" className={`series ${k}`} />
              <text x="32" y="4" className="tag">{LAYOUT_SHORT[k]}</text>
            </g>
          ))}
        </g>
      </svg>
    </figure>
  )
}
