import { useState } from 'react'
import { useI18n } from '../../i18n/context'
import type { ValidationData } from '../../lib/validationData'

export function HoldoutTable({ holdout }: { holdout: ValidationData['holdout'] }) {
  const { t, f } = useI18n()
  const v = t.validationUi
  const h = v.holdoutHeaders
  const folds = Object.keys(holdout)
  const [fold, setFold] = useState(folds[1] ?? folds[0] ?? '')
  const rows = Object.entries(holdout[fold] ?? {})
  return (
    <div className="table-wrap">
      <div className="segmented" role="radiogroup" aria-label={v.foldAria}>
        {folds.map((f) => <button key={f} type="button" role="radio" aria-checked={fold === f} onClick={() => setFold(f)}>{f}</button>)}
      </div>
      <table className="staff-table">
        <caption>{v.holdoutCaption}</caption>
        <thead><tr><th scope="col">{h.metric}</th><th scope="col">{h.n}</th><th scope="col">{h.bias}</th><th scope="col">{h.mape}</th><th scope="col">{h.coverage}</th></tr></thead>
        <tbody>
          {rows.map(([label, m]) => (
            <tr key={label}>
              <th scope="row">{v.metricLabel(label)}</th><td className="num">{m.n}</td><td className="num">{f.signedPct(m.bias_pct)}</td><td className="num">{f.pct(m.mape_pct)}</td><td className="num">{f.pct(m.coverage_pct, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function RecalTable({ recal }: { recal: ValidationData['recalibration'] }) {
  const { t, f } = useI18n()
  const v = t.validationUi
  const h = v.recalHeaders
  return (
    <div className="table-wrap">
      <table className="staff-table">
        <caption>{v.recalCaption}</caption>
        <thead><tr><th scope="col">{h.fold}</th><th scope="col">{h.metric}</th><th scope="col">{h.stale}</th><th scope="col">{h.fresh}</th></tr></thead>
        <tbody>
          {Object.entries(recal).flatMap(([fold, metrics]) => Object.entries(metrics).map(([label, m]) => (
            <tr key={fold + label}>
              <th scope="row">{fold}</th><td>{v.metricLabel(label)}</td><td className="num">{f.pct(m.stale.mape)}</td><td className="num">{f.pct(m.fresh.mape)}</td>
            </tr>
          )))}
        </tbody>
      </table>
    </div>
  )
}

export function SurrogateTable({ s }: { s: ValidationData['surrogate'] }) {
  const { t, f } = useI18n()
  const v = t.validationUi
  const h = v.surrogateHeaders
  return (
    <div className="table-wrap">
      <table className="staff-table">
        <caption>{v.surrogateCaption}</caption>
        <thead><tr><th scope="col">{h.rho}</th><th scope="col">{h.n}</th><th scope="col">{h.noise}</th><th scope="col">{h.surrogate}</th><th scope="col">{h.erlang}</th></tr></thead>
        <tbody>
          {s.by_rho.map((r) => (
            <tr key={r.rho}><th scope="row" className="num">{r.rho}</th><td className="num">{r.n}</td><td className="num">{f.num(r.sim_noise)}</td><td className="num">{f.num(r.surrogate_mae)}</td><td className="num">{f.num(r.erlang_c_mae)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ArrivalTable({ arrival }: { arrival: ValidationData['arrival'] }) {
  const { t, f } = useI18n()
  const v = t.validationUi
  const h = v.arrivalHeaders
  return (
    <div className="table-wrap">
      <table className="staff-table">
        <caption>{v.arrivalCaption}</caption>
        <thead><tr><th scope="col">{h.fold}</th><th scope="col">{h.profile}</th><th scope="col">{h.scaled}</th><th scope="col">{h.gbm}</th></tr></thead>
        <tbody>
          {Object.entries(arrival).map(([fold, a]) => {
            const m = Object.values(a.methods)
            return <tr key={fold}><th scope="row">{fold}</th>{m.map((x, i) => <td key={i} className="num">{f.pct(x.mape)}</td>)}</tr>
          })}
        </tbody>
      </table>
    </div>
  )
}
