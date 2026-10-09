import type { ClockRef } from '../hooks/usePlayback'
import { useI18n } from '../i18n/context'
import { LAYOUTS } from '../lib/layoutNames'
import type { DowGroup, LayoutKind, ModelKind } from '../types/scenario'

export interface Settings {
  day: DowGroup
  hour: number
  lanes: number
  layout: LayoutKind
  /** Yan yana karşılaştırmada sol ve sağ sahnenin düzeni. */
  left: LayoutKind
  right: LayoutKind
  speed: number
  /** Aynı müşteriler, iki düzen yan yana. */
  compare: boolean
  /** Ortak kuyruğun yürüme ve yavaşlama bedeli sayılsın mı. */
  model: ModelKind
}

interface Props {
  settings: Settings
  onChange: (s: Settings) => void
  clock: ClockRef
  onRestart: () => void
  playing: boolean
  onTogglePlay: () => void
}

const DAYS: DowGroup[] = ['mon_thu', 'fri', 'sat', 'sun']
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8)
const SPEEDS = [10, 30, 90]

export function Controls({ settings: s, onChange, clock, onRestart, playing, onTogglePlay }: Props) {
  const { t } = useI18n()
  const c = t.controls
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    if (k === 'speed') clock.current.speed = v as number
    onChange({ ...s, [k]: v })
  }
  return (
    <form className="controls" onSubmit={(e) => e.preventDefault()} aria-label={c.aria}>
      <label>
        {c.day}
        <select value={s.day} onChange={(e) => set('day', e.target.value as DowGroup)}>
          {DAYS.map((v) => <option key={v} value={v}>{t.days[v]}</option>)}
        </select>
      </label>
      <label>
        {c.hour}
        <select value={s.hour} onChange={(e) => set('hour', Number(e.target.value))}>
          {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
        </select>
      </label>
      <div className="stepper" role="group" aria-label={c.lanesAria}>
        <span>{c.lanes}</span>
        <button type="button" onClick={() => set('lanes', Math.max(1, s.lanes - 1))} aria-label={c.lanesDec}>−</button>
        <output className="num">{s.lanes}</output>
        <button type="button" onClick={() => set('lanes', Math.min(10, s.lanes + 1))} aria-label={c.lanesInc}>+</button>
      </div>
      <div className="segmented" role="radiogroup" aria-label={c.view}>
        {([[false, c.single], [true, c.compare]] as const).map(([v, l]) => (
          <button key={String(v)} type="button" role="radio" aria-checked={s.compare === v} onClick={() => set('compare', v)}>{l}</button>
        ))}
      </div>
      {!s.compare ? (
        <label>
          {c.layout}
          <select value={s.layout} onChange={(e) => set('layout', e.target.value as LayoutKind)}>
            {LAYOUTS.map((k) => <option key={k} value={k}>{t.layout[k]}</option>)}
          </select>
        </label>
      ) : (
        <>
          <label>
            {c.left}
            <select value={s.left} onChange={(e) => set('left', e.target.value as LayoutKind)}>
              {LAYOUTS.map((k) => <option key={k} value={k}>{t.layout[k]}</option>)}
            </select>
          </label>
          <label>
            {c.right}
            <select value={s.right} onChange={(e) => set('right', e.target.value as LayoutKind)}>
              {LAYOUTS.map((k) => <option key={k} value={k}>{t.layout[k]}</option>)}
            </select>
          </label>
        </>
      )}
      <div className="field">
        <span id="model-label">{c.model}</span>
        <div className="segmented" role="radiogroup" aria-labelledby="model-label">
          {(['saha', 'ders'] as const).map((v) => (
            <button key={v} type="button" role="radio" aria-checked={s.model === v} onClick={() => set('model', v)}>{t.model[v]}</button>
          ))}
        </div>
      </div>
      <div className="segmented" role="radiogroup" aria-label={c.speed}>
        {SPEEDS.map((v) => (
          <button key={v} type="button" role="radio" aria-checked={s.speed === v} onClick={() => set('speed', v)}>×{v}</button>
        ))}
      </div>
      <div className="actions">
        <button type="button" className="primary" onClick={onTogglePlay}>{playing ? c.pause : c.play}</button>
        <button type="button" onClick={onRestart}>{c.restart}</button>
      </div>
    </form>
  )
}
