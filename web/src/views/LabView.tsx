import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CompareChart } from '../components/CompareChart'
import { CompareTable } from '../components/CompareTable'
import { Controls, type Settings } from '../components/Controls'
import { Hud } from '../components/Hud'
import { LiveTag } from '../components/LiveTag'
import { StoreScene } from '../components/StoreScene'
import { useClockDriver, type PlaybackClock } from '../hooks/usePlayback'
import { pairedComparison } from '../lib/compare'
import { useI18n } from '../i18n/context'
import { LAYOUTS } from '../lib/layoutNames'
import { loadParams } from '../lib/params'
import { buildStream, runLayout, type LayoutRun } from '../lib/scenario'
import { waitingSeries } from '../lib/series'
import type { LayoutKind, ReplayStats } from '../types/scenario'

const SEED = 7
const EMPTY: ReplayStats = { waiting: 0, serving: 0, done: 0, meanWaitStarted: 0, laneServing: new Uint8Array(0) }
const INITIAL: Settings = { day: 'fri', hour: 17, lanes: 7, layout: 'separate-jsq', left: 'separate-jsq', right: 'pooled', speed: 30, compare: false, model: 'saha' }
const parsed = loadParams()

export default function LabView() {
  const { t } = useI18n()
  const [settings, setSettings] = useState<Settings>(INITIAL)
  const [playing, setPlaying] = useState(true)
  const clock = useRef<PlaybackClock>({ t: 0, speed: INITIAL.speed, playing: true, end: 3600, epoch: 0 })
  const statsA = useRef<ReplayStats>(EMPTY)
  const statsB = useRef<ReplayStats>(EMPTY)
  useClockDriver(clock)

  const stream = useMemo(
    () => (parsed.status === 'ok' ? buildStream(parsed.params, settings.day, settings.hour, SEED) : null),
    [settings.day, settings.hour],
  )
  const runs = useMemo(() => {
    if (!stream) return null
    return Object.fromEntries(LAYOUTS.map((k) => [k, runLayout(stream, settings.lanes, k, settings.model)])) as Record<LayoutKind, LayoutRun>
  }, [stream, settings.lanes, settings.model])
  const paired = useMemo(
    () => (settings.compare && parsed.status === 'ok' && stream && stream.customers.length > 0 ? pairedComparison(parsed.params, settings.day, settings.hour, settings.lanes, settings.model) : null),
    [settings.compare, settings.day, settings.hour, settings.lanes, settings.model, stream],
  )
  const endAll = runs ? Math.max(...LAYOUTS.map((k) => runs[k].endTime)) : 3600
  const series = useMemo(() => {
    if (!settings.compare || !runs) return null
    return Object.fromEntries(LAYOUTS.map((k) => [k, waitingSeries(runs[k].journeys, endAll)])) as Record<LayoutKind, ReturnType<typeof waitingSeries>>
  }, [settings.compare, runs, endAll])

  const endTime = settings.compare ? endAll : (runs?.[settings.layout].endTime ?? 3600)
  const restart = useCallback(() => {
    clock.current.t = 0
    clock.current.epoch += 1
    clock.current.playing = true
    setPlaying(true)
  }, [])
  useEffect(() => {
    clock.current.end = endTime
    restart()
  }, [stream, runs, settings.compare, settings.left, settings.right, settings.layout, endTime, restart])

  const togglePlay = () => {
    clock.current.playing = !clock.current.playing
    setPlaying(clock.current.playing)
  }

  if (parsed.status === 'error') return <div className="state"><h1>{t.errors.params}</h1><p>{parsed.message}</p></div>
  if (!stream || !runs) return <div className="state"><p>{t.loading}</p></div>
  if (stream.customers.length === 0) return <div className="state"><h1>{t.errors.noCustomersTitle}</h1><p>{t.errors.noCustomersBody}</p></div>

  const head = (
    <header className="page-head">
      <h1>{t.lab.title}</h1>
      <p>{t.lab.intro}</p>
    </header>
  )
  const controls = <Controls settings={settings} onChange={setSettings} clock={clock} onRestart={restart} playing={playing} onTogglePlay={togglePlay} />

  if (settings.compare) {
    const scenes: [LayoutKind, { current: ReplayStats }][] = [[settings.left, statsA], [settings.right, statsB]]
    return (
      <div className="lab wide">
        {head}
        {controls}
        <section className="stages" aria-label={t.lab.compareAria}>
          {scenes.map(([k, ref], i) => (
            <div className="stage" key={i}>
              <StoreScene compact journeys={runs[k].journeys} layout={k} lanes={settings.lanes} clock={clock} statsRef={ref} />
              <LiveTag title={t.layout[k]} statsRef={ref} />
            </div>
          ))}
        </section>
        {paired && <CompareTable c={paired} />}
        {series && <CompareChart series={series} hour={settings.hour} endTime={endTime} clock={clock} />}
      </div>
    )
  }

  const single = runs[settings.layout]
  return (
    <div className="lab">
      {head}
      {controls}
      <section className="stage" aria-label={t.lab.stageAria}>
        <StoreScene journeys={single.journeys} layout={settings.layout} lanes={settings.lanes} clock={clock} statsRef={statsA} />
      </section>
      <Hud clock={clock} statsRef={statsA} hour={settings.hour} run={single} customers={single.journeys.length} />
    </div>
  )
}
