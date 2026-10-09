import { useMemo, useState } from 'react'
import { StaffChart } from '../components/StaffChart'
import { StaffTable, type RowCheck } from '../components/StaffTable'
import rawModel from '../data/surrogate.json'
import { loadParams } from '../lib/params'
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

const DAYS: [DowGroup, string][] = [['mon_thu', 'Pazartesi–Perşembe'], ['fri', 'Cuma'], ['sat', 'Cumartesi'], ['sun', 'Pazar']]
const TARGETS = [60, 120, 180, 300]
const CHECK_REPS = 40

export default function StaffingView() {
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

  if (loadedModel.status === 'error') return <div className="state"><h1>Vekil model okunamadı</h1><p>{loadedModel.message}</p></div>
  if (params.status === 'error') return <div className="state"><h1>Parametre dosyası okunamadı</h1><p>{params.message}</p></div>
  if (!plan) return <div className="state"><p>Yükleniyor</p></div>

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

  return (
    <div className="staffing">
      <section className="staff-intro">
        <h2>Her saat için en az kaç kasa açık olmalı?</h2>
        <p>
          Hedef: müşterilerin %90'ı en fazla seçtiğin süre kadar beklesin. Cevabı simülatörün <strong>vekil modeli</strong> verir
          (simülatörün binlerce koşusundan öğrenilmiş bir öğrenme modeli; tarayıcıda çalışır). Önerinin doğruluğunu gerçek simülatörle her satırda sınayabilirsin.
        </p>
      </section>
      <form className="controls" onSubmit={(e) => e.preventDefault()} aria-label="Planlama ayarları">
        <label>Gün
          <select value={day} onChange={(e) => reset(setDay)(e.target.value as DowGroup)}>
            {DAYS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label>Müşteriler kuyruğu nasıl seçiyor?
          <select value={layout} onChange={(e) => reset(setLayout)(e.target.value as StaffingLayout)}>
            <option value="separate-jsq">Ayrı kuyruk, en kısayı seçer</option>
            <option value="pooled">Tek ortak kuyruk</option>
          </select>
        </label>
        <label>%90 en fazla bekleme
          <select value={target} onChange={(e) => reset(setTarget)(Number(e.target.value))}>
            {TARGETS.map((t) => <option key={t} value={t}>{t / 60} dk</option>)}
          </select>
        </label>
        <div className="actions">
          <button type="button" className="primary" onClick={() => verifyRows(plan.average)}>Tüm saatleri simülatörle sına</button>
        </div>
      </form>
      <p className="fine num" aria-live="polite">
        Plan: 2 senaryo × {plan.average.length} saat × en çok 10 kasa, vekil modelle {plan.ms.toFixed(1)} ms.
        {checkMs !== null && ` Simülatörle sınama (${done.length} saat × 2 kasa sayısı × ${CHECK_REPS} tekrar): ${(checkMs / 1000).toFixed(1)} sn.`}
      </p>
      {done.length > 0 && (
        <p className="verdict">
          Simülatör sonucu: önerilen kasa sayısı {done.length} saatin {meets}'inde hedefi sağlıyor
          {lessCount > 0 && `; bir eksik kasa ${lessCount} saatin ${lessFails}'inde sağlamıyor`}.
        </p>
      )}
      {unmet > 0 && (
        <p className="hud-note">{unmet} saatte 10 kasayla bile hedef sağlanamıyor (mağazada 10 kasa var); tabloda "sağlanamıyor" yazar.</p>
      )}
      <StaffChart average={plan.average} busy={plan.busy} />
      <StaffTable average={plan.average} busy={plan.busy} checks={checks} onVerify={(r) => verifyRows([r])} />
      <p className="fine">
        Sınırlar: vekil, eğitim aralığında (yük oranı ρ ≤ 1,05, en çok 10 kasa) güvenilir; plan ρ &lt; 0,98 şartını da arar.
        "Yoğun gün", günlük talep çarpanının %90 üst dilimidir. Bekleme için gerçek mağaza verisi yok, doğrulama simülatörle yapılır.
      </p>
    </div>
  )
}
