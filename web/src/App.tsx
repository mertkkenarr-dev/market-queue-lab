import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CompareChart } from './components/CompareChart'
import { CompareTable } from './components/CompareTable'
import { Controls, type Settings } from './components/Controls'
import { Hud } from './components/Hud'
import { LiveTag } from './components/LiveTag'
import { StoreScene } from './components/StoreScene'
import { useClockDriver, type PlaybackClock } from './hooks/usePlayback'
import { pairedComparison } from './lib/compare'
import { loadParams } from './lib/params'
import { buildStream, runLayout } from './lib/scenario'
import { waitingSeries } from './lib/series'
import type { ReplayStats } from './types/scenario'

const SEED = 7
const EMPTY: ReplayStats = { waiting: 0, serving: 0, done: 0, meanWaitStarted: 0, laneServing: new Uint8Array(0) }
const INITIAL: Settings = { day: 'fri', hour: 17, lanes: 5, layout: 'separate-jsq', speed: 30, compare: false }
const parsed = loadParams()

export default function App() {
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
  const separate = useMemo(() => (stream ? runLayout(stream, settings.lanes, 'separate-jsq') : null), [stream, settings.lanes])
  const pooled = useMemo(() => (stream ? runLayout(stream, settings.lanes, 'pooled') : null), [stream, settings.lanes])
  const single = settings.layout === 'pooled' ? pooled : separate
  const paired = useMemo(
    () => (settings.compare && parsed.status === 'ok' && stream && stream.customers.length > 0 ? pairedComparison(parsed.params, settings.day, settings.hour, settings.lanes) : null),
    [settings.compare, settings.day, settings.hour, settings.lanes, stream],
  )
  const series = useMemo(
    () => (settings.compare && separate && pooled ? { sep: waitingSeries(separate.journeys, Math.max(separate.endTime, pooled.endTime)), pool: waitingSeries(pooled.journeys, Math.max(separate.endTime, pooled.endTime)) } : null),
    [settings.compare, separate, pooled],
  )

  const endTime = settings.compare ? Math.max(separate?.endTime ?? 0, pooled?.endTime ?? 0) : (single?.endTime ?? 3600)
  const restart = useCallback(() => {
    clock.current.t = 0
    clock.current.epoch += 1
    clock.current.playing = true
    setPlaying(true)
  }, [])
  useEffect(() => {
    clock.current.end = endTime
    restart()
  }, [stream, separate, pooled, settings.compare, endTime, restart])

  const togglePlay = () => {
    clock.current.playing = !clock.current.playing
    setPlaying(clock.current.playing)
  }

  if (parsed.status === 'error') return <main className="state"><h1>Parametre dosyası okunamadı</h1><p>{parsed.message}</p></main>
  if (!stream || !separate || !pooled || !single) return <main className="state"><p>Yükleniyor</p></main>
  if (stream.customers.length === 0) return <main className="state"><h1>Bu saatte müşteri yok</h1><p>Başka bir gün ya da saat seç.</p></main>

  const controls = <Controls settings={settings} onChange={setSettings} clock={clock} onRestart={restart} playing={playing} onTogglePlay={togglePlay} />
  const header = (
    <header>
      <h1>Kuyruk Laboratuvarı</h1>
      <p>Gerçek market verisinden öğrenilmiş müşteri ve servis süresi modeliyle, ayrık-olay simülasyonu. Aynı müşteriler, farklı kuyruk düzeni.</p>
    </header>
  )

  if (settings.compare) {
    return (
      <main className="lab wide">
        {header}
        <section className="stages" aria-label="Yan yana karşılaştırma">
          <div className="stage">
            <StoreScene compact journeys={separate.journeys} layout="separate-jsq" lanes={settings.lanes} clock={clock} statsRef={statsA} />
            <LiveTag title="Her kasaya ayrı kuyruk" statsRef={statsA} />
          </div>
          <div className="stage">
            <StoreScene compact journeys={pooled.journeys} layout="pooled" lanes={settings.lanes} clock={clock} statsRef={statsB} />
            <LiveTag title="Tek ortak kuyruk" statsRef={statsB} />
          </div>
        </section>
        {controls}
        {paired && <CompareTable c={paired} />}
        {series && <CompareChart separate={series.sep} pooled={series.pool} hour={settings.hour} endTime={endTime} clock={clock} />}
      </main>
    )
  }

  return (
    <main className="lab">
      {header}
      <section className="stage" aria-label="Mağaza sahnesi">
        <StoreScene journeys={single.journeys} layout={settings.layout} lanes={settings.lanes} clock={clock} statsRef={statsA} />
      </section>
      <Hud clock={clock} statsRef={statsA} hour={settings.hour} run={single} customers={single.journeys.length} />
      {controls}
    </main>
  )
}
