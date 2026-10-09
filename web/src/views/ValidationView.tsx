import { GapChart } from '../components/story/GapChart'
import { BiasBars } from '../components/validation/BiasBars'
import { Scatter } from '../components/validation/Scatter'
import { ArrivalTable, HoldoutTable, RecalTable, SurrogateTable } from '../components/validation/Tables'
import { TheoryChart } from '../components/validation/TheoryChart'
import { VALIDATION } from '../content/validation'
import type { ValidationNumbers } from '../content/validation.types'
import raw from '../data/validation.json'
import { useI18n } from '../i18n/context'
import { parseValidation } from '../lib/validationData'

const state = parseValidation(raw)

export default function ValidationView() {
  const { lang, t, f } = useI18n()
  if (state.status === 'error') return <div className="state"><h1>{t.errors.validation}</h1><p>{state.message}</p></div>
  const d = state.data
  const c = VALIDATION[lang]
  const u = t.validationUi.units
  const gapMetric = Object.entries(d.holdout['P1+P2→P3'] ?? {}).find(([k]) => k.startsWith('Kısa kasiyer'))?.[1]
  const n: ValidationNumbers = {
    gapMape: gapMetric ? f.pct(gapMetric.mape_pct, 1) : null,
    gapCoverage: gapMetric ? f.pct(gapMetric.coverage_pct, 0) : null,
    gapCorr: f.num(d.gaps.corr, 2),
    gapSec: d.gaps.shortSeconds,
    lanesProxy: f.num(d.store.lanesProxyMean, 1),
    lanesLogs: f.num(d.store.lanesLogsMean, 1),
    r2Mean: f.num(d.surrogate.r2.wait_mean ?? 0, 2),
    r2P90: f.num(d.surrogate.r2.wait_p90 ?? 0, 2),
  }
  return (
    <div className="validation">
      <header className="page-head">
        <h1>{c.title}</h1>
        <p>{c.intro}</p>
      </header>
      <p className="callout">{c.callout}</p>

      <section aria-labelledby="v1">
        <h2 id="v1">{c.theory.title}</h2>
        <p>{c.theory.body}</p>
        <TheoryChart theory={d.theory} />
      </section>

      <section aria-labelledby="v2">
        <h2 id="v2">{c.gaps.title}</h2>
        <p>{c.gaps.body(n)}</p>
        <GapChart cdf={d.gaps.cdf} shortSeconds={d.gaps.shortSeconds} />
        <div className="scatter-single">
          <Scatter title={c.gaps.scatterTitle(d.gaps.shortSeconds)} unit={u.share} rows={d.gaps.scatter} />
        </div>
        <p>{c.gaps.honest(n)}</p>
        <p>{c.gaps.bug(n)}</p>
      </section>

      <section aria-labelledby="v3">
        <h2 id="v3">{c.holdout.title}</h2>
        <p>{c.holdout.body}</p>
        <HoldoutTable holdout={d.holdout} />
        <BiasBars holdout={d.holdout} />
        <p>{c.holdout.after}</p>
        <div className="scatter-grid">
          <Scatter title={c.holdout.scatters.service} unit={u.seconds} rows={d.scatter.serviceMean} />
          <Scatter title={c.holdout.scatters.occupancy} unit={u.share} rows={d.scatter.utilization} />
          <Scatter title={c.holdout.scatters.count} unit={u.people} rows={d.scatter.count} />
          <Scatter title={c.holdout.scatters.basket} unit={u.items} rows={d.scatter.basket} />
        </div>
        <p className="fine">{c.holdout.fine}</p>
      </section>

      <section aria-labelledby="v4">
        <h2 id="v4">{c.recal.title}</h2>
        <p>{c.recal.body}</p>
        <RecalTable recal={d.recalibration} />
        <p>{c.recal.after}</p>
      </section>

      <section aria-labelledby="v5">
        <h2 id="v5">{c.ml.title}</h2>
        <p>{c.ml.body(n)}</p>
        <SurrogateTable s={d.surrogate} />
        <p>{c.ml.arrival}</p>
        <ArrivalTable arrival={d.arrival} />
      </section>

      <section aria-labelledby="v6">
        <h2 id="v6">{c.limits.title}</h2>
        <ul className="limits">{c.limits.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
      </section>
    </div>
  )
}
