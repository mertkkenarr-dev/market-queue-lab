import { useMemo, useState } from 'react'
import { StaffChart } from '../components/StaffChart'
import { StaffTable, type RowCheck } from '../components/StaffTable'
import rawModel from '../data/surrogate.json'
import rawValidation from '../data/validation.json'
import { useI18n } from '../i18n/context'
import { loadParams } from '../lib/params'
import { parseValidation } from '../lib/validationData'
import { planDay, verifyLanes, type StaffingLayout, type StaffingRow } from '../lib/staffing'
import { parseSurrogate, type SurrogateModel } from '../lib/surrogate'
import type { DowGroup } from '../types/scenario'

type Loaded = { status: 'ok'; model: SurrogateModel } | { status: 'error'; message: string }
const loadModel = (): Loaded => {
  try {
    return { status: 'ok', model: parseSurrogate(rawModel) }
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) }
  }
}
const loadedModel = loadModel()
const params = loadParams()
const validation = parseValidation(rawValidation)

const DAYS: DowGroup[] = ['mon_thu', 'fri', 'sat', 'sun']
const TARGETS = [60, 120, 180, 300]
const CHECK_REPS = 40

export default function StaffingView() {
  const { t, f } = useI18n()
  const s = t.staffing
  const [day, setDay] = useState<DowGroup>('fri')
  const [layout, setLayout] = useState<StaffingLayout>('separate-jsq')
  const [target, setTarget] = useState(120)
  const [checks, setChecks] = useState<Record<number, RowCheck>>({})
  const [checkMs, setCheckMs] = useState<number | null>(null)

  const plan = useMemo(() => {
    if (loadedModel.status !== 'ok' || params.status !== 'ok') return null
    const t0 = performance.now()
    const average = planDay(loadedModel.model, params.params, day, layout, target, 'ortalama')
    const busy = planDay(loadedModel.model, params.params, day, layout, target, 'yoğun')
    return { average, busy, ms: performance.now() - t0 }
  }, [day, layout, target])

  if (loadedModel.status === 'error') return <div className="state"><h1>{t.errors.model}</h1><p>{loadedModel.message}</p></div>
  if (params.status === 'error') return <div className="state"><h1>{t.errors.params}</h1><p>{params.message}</p></div>
  if (!plan) return <div className="state"><p>{t.loading}</p></div>

  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setChecks({})
    setCheckMs(null)
  }
  const verifyRows = (rows: readonly StaffingRow[]) => {
    const t0 = performance.now()
    const next: Record<number, RowCheck> = {}
    for (const r of rows) {
      if (r.lanes === null) continue
      next[r.hour] = {
        at: verifyLanes(params.params, day, r.hour, r.lanes, layout, target, CHECK_REPS),
        less: r.lanes > 1 ? verifyLanes(params.params, day, r.hour, r.lanes - 1, layout, target, CHECK_REPS) : null,
      }
    }
    setChecks((c) => ({ ...c, ...next }))
    setCheckMs(performance.now() - t0)
  }

  const done = Object.values(checks)
  const meets = done.filter((c) => c.at.meets >= 0.5).length
  const lessFails = done.filter((c) => c.less && c.less.meets < 0.5).length
  const lessCount = done.filter((c) => c.less).length
  const unmet = plan.average.filter((r) => r.lanes === null).length
  const observed = validation.status === 'ok' ? validation.data.observedLanes[day] : undefined
  const gaps = observed ? plan.average.flatMap((r) => (r.lanes !== null && observed[String(r.hour)] !== undefined ? [r.lanes - (observed[String(r.hour)] as number)] : [])) : []
  const gapMean = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null

  return (
    <div className="staffing">
      <header className="page-head">
        <h1>{s.title}</h1>
        <p>{s.intro}</p>
      </header>
      <form className="controls" onSubmit={(e) => e.preventDefault()} aria-label={s.formAria}>
        <label>{s.day}
          <select value={day} onChange={(e) => reset(setDay)(e.target.value as DowGroup)}>
            {DAYS.map((v) => <option key={v} value={v}>{t.days[v]}</option>)}
          </select>
        </label>
        <label>{s.howChoose}
          <select value={layout} onChange={(e) => reset(setLayout)(e.target.value as StaffingLayout)}>
            <option value="separate-jsq">{t.layout['separate-jsq']}</option>
            <option value="pooled">{t.layout.pooled}</option>
          </select>
        </label>
        <label>{s.target}
          <select value={target} onChange={(e) => reset(setTarget)(Number(e.target.value))}>
            {TARGETS.map((v) => <option key={v} value={v}>{s.targetOption(v / 60)}</option>)}
          </select>
        </label>
        <div className="actions">
          <button type="button" className="primary" onClick={() => verifyRows(plan.average)}>{s.verifyAll}</button>
        </div>
      </form>
      <p className="fine num" aria-live="polite">
        {s.planLine(plan.average.length, f.num(plan.ms, 1))}
        {checkMs !== null && s.checkLine(done.length, CHECK_REPS, f.num(checkMs / 1000, 1))}
      </p>
      {done.length > 0 && (
        <p className="verdict">
          {s.verdict(done.length, meets)}
          {lessCount > 0 && s.verdictLess(lessCount, lessFails)}.
        </p>
      )}
      {unmet > 0 && (
        <p className="hud-note">{s.unmet(unmet)}</p>
      )}
      <StaffChart average={plan.average} busy={plan.busy} observed={validation.status === 'ok' ? validation.data.observedLanes[day] : undefined} />
      {gapMean !== null && layout === 'separate-jsq' && (
        <p className="staff-note">
          {gapMean > 0.25
            ? s.moreThanStore(f.num(gapMean, 1), f.wait(validation.status === 'ok' ? validation.data.store.p90Median : 0))
            : gapMean < -0.25
              ? s.lessThanStore(f.num(-gapMean, 1))
              : s.sameAsStore}
        </p>
      )}
      <StaffTable average={plan.average} busy={plan.busy} checks={checks} onVerify={(r) => verifyRows([r])} />
      <p className="fine">{s.limits}</p>
    </div>
  )
}
