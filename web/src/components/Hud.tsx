import { useEffect, useState } from 'react'
import type { ClockRef } from '../hooks/usePlayback'
import type { LayoutRun } from '../lib/scenario'
import type { ReplayStats } from '../types/scenario'

interface Props {
  clock: ClockRef
  statsRef: { current: ReplayStats }
  hour: number
  run: LayoutRun
  customers: number
}

const fmtClock = (hour: number, t: number): string => {
  const total = hour * 60 + Math.floor(t / 60)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
const fmtSec = (s: number): string => (s >= 60 ? `${Math.floor(s / 60)} dk ${Math.round(s % 60)} sn` : `${Math.round(s)} sn`)

export function Hud({ clock, statsRef, hour, run, customers }: Props) {
  const [view, setView] = useState({ t: 0, stats: statsRef.current })
  useEffect(() => {
    const id = window.setInterval(() => setView({ t: clock.current.t, stats: statsRef.current }), 100)
    return () => window.clearInterval(id)
  }, [clock, statsRef])

  const finished = view.t >= clock.current.end
  return (
    <aside className="hud" aria-label="Canlı durum">
      <p className="hud-clock num">{fmtClock(hour, view.t)}</p>
      <p className="hud-label">şu an kuyrukta</p>
      <p className="hud-big num" aria-live="polite">{view.stats.waiting}</p>
      <dl className="hud-list">
        <div><dt>kasada</dt><dd className="num">{view.stats.serving}</dd></div>
        <div><dt>çıkan</dt><dd className="num">{view.stats.done}/{customers}</dd></div>
        <div><dt>şimdiye dek ort. bekleme</dt><dd className="num">{fmtSec(view.stats.meanWaitStarted)}</dd></div>
      </dl>
      <h2>Bu saatin sonucu</h2>
      <dl className="hud-list">
        <div><dt>ortalama bekleme</dt><dd className="num">{fmtSec(run.meanWait)}</dd></div>
        <div><dt>%90 en fazla</dt><dd className="num">{fmtSec(run.waitP90)}</dd></div>
        <div><dt>bekleyen müşteri payı</dt><dd className="num">%{Math.round(run.probWait * 100)}</dd></div>
        <div><dt>kasa doluluğu</dt><dd className="num">%{Math.round(run.utilization * 100)}</dd></div>
      </dl>
      {finished && <p className="hud-note">Saat bitti. Yeniden başlat ya da ayarı değiştir.</p>}
    </aside>
  )
}
