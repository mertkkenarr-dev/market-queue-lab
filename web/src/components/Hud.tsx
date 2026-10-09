import { useEffect, useState } from 'react'
import type { ClockRef } from '../hooks/usePlayback'
import { useI18n } from '../i18n/context'
import type { LayoutRun } from '../lib/scenario'
import type { ReplayStats } from '../types/scenario'

interface Props {
  clock: ClockRef
  statsRef: { current: ReplayStats }
  hour: number
  run: LayoutRun
  customers: number
}

const OVERFLOW_AT = 40

export function Hud({ clock, statsRef, hour, run, customers }: Props) {
  const { t, f } = useI18n()
  const h = t.hud
  const [view, setView] = useState({ t: 0, stats: statsRef.current })
  useEffect(() => {
    const id = window.setInterval(() => setView({ t: clock.current.t, stats: statsRef.current }), 100)
    return () => window.clearInterval(id)
  }, [clock, statsRef])

  const finished = view.t >= clock.current.end
  return (
    <aside className="hud" aria-label={h.aria}>
      <p className="hud-clock num">{f.clock(hour, view.t)}</p>
      <p className="hud-label">{h.nowWaiting}</p>
      <p className="hud-big num" aria-live="polite">{view.stats.waiting}</p>
      <dl className="hud-list">
        <div><dt>{h.serving}</dt><dd className="num">{view.stats.serving}</dd></div>
        <div><dt>{h.done}</dt><dd className="num">{view.stats.done}/{customers}</dd></div>
        <div><dt>{h.meanSoFar}</dt><dd className="num">{f.wait(view.stats.meanWaitStarted)}</dd></div>
      </dl>
      <h2>{h.hourResult}</h2>
      <dl className="hud-list">
        <div><dt>{h.meanWait}</dt><dd className="num">{f.wait(run.meanWait)}</dd></div>
        <div><dt>{h.p90}</dt><dd className="num">{f.wait(run.waitP90)}</dd></div>
        <div><dt>{h.probWait}</dt><dd className="num">{f.share(run.probWait)}</dd></div>
        <div><dt>{h.occupancy}</dt><dd className="num">{f.share(run.utilization)}</dd></div>
      </dl>
      {view.stats.waiting > OVERFLOW_AT && (
        <p className="hud-note">{h.overflow}</p>
      )}
      {finished && <p className="hud-note">{h.finished}</p>}
    </aside>
  )
}
