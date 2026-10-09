import type { ClockRef } from '../hooks/usePlayback'
import type { DowGroup, LayoutKind } from '../types/scenario'

export interface Settings {
  day: DowGroup
  hour: number
  lanes: number
  layout: LayoutKind
  speed: number
  /** Aynı müşteriler, iki düzen yan yana. */
  compare: boolean
}

interface Props {
  settings: Settings
  onChange: (s: Settings) => void
  clock: ClockRef
  onRestart: () => void
  playing: boolean
  onTogglePlay: () => void
}

const DAYS: [DowGroup, string][] = [['mon_thu', 'Pazartesi–Perşembe'], ['fri', 'Cuma'], ['sat', 'Cumartesi'], ['sun', 'Pazar']]
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8)
const SPEEDS = [10, 30, 90]

export function Controls({ settings: s, onChange, clock, onRestart, playing, onTogglePlay }: Props) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    if (k === 'speed') clock.current.speed = v as number
    onChange({ ...s, [k]: v })
  }
  return (
    <form className="controls" onSubmit={(e) => e.preventDefault()} aria-label="Senaryo ayarları">
      <label>
        Gün
        <select value={s.day} onChange={(e) => set('day', e.target.value as DowGroup)}>
          {DAYS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label>
        Saat
        <select value={s.hour} onChange={(e) => set('hour', Number(e.target.value))}>
          {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
        </select>
      </label>
      <div className="stepper" role="group" aria-label="Açık kasa sayısı">
        <span>Açık kasa</span>
        <button type="button" onClick={() => set('lanes', Math.max(1, s.lanes - 1))} aria-label="Kasa azalt">−</button>
        <output className="num">{s.lanes}</output>
        <button type="button" onClick={() => set('lanes', Math.min(10, s.lanes + 1))} aria-label="Kasa artır">+</button>
      </div>
      <div className="segmented" role="radiogroup" aria-label="Görünüm">
        {([[false, 'Tek sahne'], [true, 'Yan yana karşılaştır']] as const).map(([v, l]) => (
          <button key={l} type="button" role="radio" aria-checked={s.compare === v} onClick={() => set('compare', v)}>{l}</button>
        ))}
      </div>
      {!s.compare && (
        <div className="segmented" role="radiogroup" aria-label="Kuyruk düzeni">
          {([['separate-jsq', 'Her kasaya ayrı kuyruk'], ['pooled', 'Tek ortak kuyruk']] as const).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={s.layout === v} onClick={() => set('layout', v)}>{l}</button>
          ))}
        </div>
      )}
      <div className="segmented" role="radiogroup" aria-label="Oynatma hızı">
        {SPEEDS.map((v) => (
          <button key={v} type="button" role="radio" aria-checked={s.speed === v} onClick={() => set('speed', v)}>×{v}</button>
        ))}
      </div>
      <div className="actions">
        <button type="button" className="primary" onClick={onTogglePlay}>{playing ? 'Duraklat' : 'Oynat'}</button>
        <button type="button" onClick={onRestart}>Baştan</button>
      </div>
    </form>
  )
}
