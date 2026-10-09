import { useState } from 'react'
import { num, pct, signedPct } from '../../lib/format'
import type { ValidationData } from '../../lib/validationData'

export function HoldoutTable({ holdout }: { holdout: ValidationData['holdout'] }) {
  const folds = Object.keys(holdout)
  const [fold, setFold] = useState(folds[1] ?? folds[0] ?? '')
  const rows = Object.entries(holdout[fold] ?? {})
  return (
    <div className="table-wrap">
      <div className="segmented" role="radiogroup" aria-label="Kat">
        {folds.map((f) => <button key={f} type="button" role="radio" aria-checked={fold === f} onClick={() => setFold(f)}>{f}</button>)}
      </div>
      <table className="staff-table">
        <caption>Eğitim → test. Yanlılık = simülasyon − gerçek; kapsama = gerçeğin simülasyonun %90 aralığında kaldığı pencere payı.</caption>
        <thead><tr><th scope="col">Ölçü</th><th scope="col">n</th><th scope="col">Yanlılık</th><th scope="col">Ort. mutlak hata</th><th scope="col">%90 kapsama</th></tr></thead>
        <tbody>
          {rows.map(([label, m]) => (
            <tr key={label}>
              <th scope="row">{label}</th><td className="num">{m.n}</td><td className="num">{signedPct(m.bias_pct)}</td><td className="num">{pct(m.mape_pct)}</td><td className="num">{pct(m.coverage_pct, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function RecalTable({ recal }: { recal: ValidationData['recalibration'] }) {
  return (
    <div className="table-wrap">
      <table className="staff-table">
        <caption>Test döneminin ilk 3 günüyle iki ölçek öğrenildi; skor kalan günlerde. Ortalama mutlak hata (%).</caption>
        <thead><tr><th scope="col">Kat</th><th scope="col">Ölçü</th><th scope="col">Bayat model</th><th scope="col">Kalibre model</th></tr></thead>
        <tbody>
          {Object.entries(recal).flatMap(([fold, metrics]) => Object.entries(metrics).map(([label, m]) => (
            <tr key={fold + label}>
              <th scope="row">{fold}</th><td>{label}</td><td className="num">{pct(m.stale.mape)}</td><td className="num">{pct(m.fresh.mape)}</td>
            </tr>
          )))}
        </tbody>
      </table>
    </div>
  )
}

export function SurrogateTable({ s }: { s: ValidationData['surrogate'] }) {
  return (
    <div className="table-wrap">
      <table className="staff-table">
        <caption>Hiç görülmemiş 3000 senaryoda ortalama mutlak hata (sn). Simülatör gürültüsü, daha iyisinin mümkün olmadığı tabandır.</caption>
        <thead><tr><th scope="col">Yük ρ</th><th scope="col">n</th><th scope="col">Simülatör gürültüsü</th><th scope="col">Vekil model</th><th scope="col">Erlang-C formülü</th></tr></thead>
        <tbody>
          {s.by_rho.map((r) => (
            <tr key={r.rho}><th scope="row" className="num">{r.rho}</th><td className="num">{r.n}</td><td className="num">{num(r.sim_noise)}</td><td className="num">{num(r.surrogate_mae)}</td><td className="num">{num(r.erlang_c_mae)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ArrivalTable({ arrival }: { arrival: ValidationData['arrival'] }) {
  return (
    <div className="table-wrap">
      <table className="staff-table">
        <caption>Saatlik müşteri sayısı tahmini, görülmemiş dönemde ortalama mutlak hata (%).</caption>
        <thead><tr><th scope="col">Kat</th><th scope="col">Profil ortalaması</th><th scope="col">Son dönem ölçekli</th><th scope="col">Poisson GBM</th></tr></thead>
        <tbody>
          {Object.entries(arrival).map(([fold, a]) => {
            const m = Object.values(a.methods)
            return <tr key={fold}><th scope="row">{fold}</th>{m.map((x, i) => <td key={i} className="num">{pct(x.mape)}</td>)}</tr>
          })}
        </tbody>
      </table>
    </div>
  )
}
