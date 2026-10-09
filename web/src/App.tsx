import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Controls, type Settings } from './components/Controls'
import { Hud } from './components/Hud'
import { StoreScene } from './components/StoreScene'
import type { PlaybackClock } from './hooks/usePlayback'
import { loadParams } from './lib/params'
import { buildStream, runLayout } from './lib/scenario'
import type { ReplayStats } from './types/scenario'

const SEED = 7
const EMPTY: ReplayStats = { waiting: 0, serving: 0, done: 0, meanWaitStarted: 0 }
const INITIAL: Settings = { day: 'fri', hour: 17, lanes: 5, layout: 'separate-jsq', speed: 30 }
const parsed = loadParams()

export default function App() {
  const [settings, setSettings] = useState<Settings>(INITIAL)
  const [playing, setPlaying] = useState(true)
  const clock = useRef<PlaybackClock>({ t: 0, speed: INITIAL.speed, playing: true, end: 3600 })
  const statsRef = useRef<ReplayStats>(EMPTY)

  const stream = useMemo(
    () => (parsed.status === 'ok' ? buildStream(parsed.params, settings.day, settings.hour, SEED) : null),
    [settings.day, settings.hour],
  )
  const run = useMemo(() => (stream ? runLayout(stream, settings.lanes, settings.layout) : null), [stream, settings.lanes, settings.layout])

  const restart = useCallback(() => {
    clock.current.t = 0
    clock.current.playing = true
    setPlaying(true)
  }, [])
  useEffect(() => {
    clock.current.end = run?.endTime ?? 3600
    restart()
  }, [stream, run, restart])

  const togglePlay = () => {
    clock.current.playing = !clock.current.playing
    setPlaying(clock.current.playing)
  }

  if (parsed.status === 'error') {
    return <main className="state"><h1>Parametre dosyası okunamadı</h1><p>{parsed.message}</p></main>
  }
  if (!stream || !run) return <main className="state"><p>Yükleniyor</p></main>
  if (run.journeys.length === 0) {
    return <main className="state"><h1>Bu saatte müşteri yok</h1><p>Başka bir gün ya da saat seç.</p></main>
  }

  return (
    <main className="lab">
      <header>
        <h1>Kuyruk Laboratuvarı</h1>
        <p>Gerçek market verisinden öğrenilmiş müşteri ve servis süresi modeliyle, ayrık-olay simülasyonu. Aynı müşteriler, farklı kuyruk düzeni.</p>
      </header>
      <section className="stage" aria-label="Mağaza sahnesi">
        <StoreScene journeys={run.journeys} layout={settings.layout} lanes={settings.lanes} clock={clock} statsRef={statsRef} />
      </section>
      <Hud clock={clock} statsRef={statsRef} hour={settings.hour} run={run} customers={run.journeys.length} />
      <Controls settings={settings} onChange={setSettings} clock={clock} onRestart={restart} playing={playing} onTogglePlay={togglePlay} />
    </main>
  )
}
