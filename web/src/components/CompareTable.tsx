import { describeComparison, type PairedComparison } from '../lib/compare'

const sec = (s: number): string => (s >= 60 ? `${Math.floor(s / 60)} dk ${String(Math.round(s % 60)).padStart(2, '0')} sn` : `${Math.round(s)} sn`)
const pct = (v: number): string => `%${Math.round(v * 100)}`
const signed = (s: number): string => `${s > 0 ? '+' : s < 0 ? '−' : ''}${sec(Math.abs(s))}`

/** Birden çok tekrarın ortalaması: tek bir oynatma şans eseri uç olabilir, tablo bunu düzeltir. */
export function CompareTable({ c }: { c: PairedComparison }) {
  // diff = ayrı − ortak. Okuyucuya "ortak kuyruğun etkisi" (ortak − ayrı) gösterilir: eksi = bekleme kısalıyor.
  const effect = -c.diff.mean
  const lo = -c.diff.ciHigh
  const hi = -c.diff.ciLow
  return (
    <section className="compare-table" aria-label="Düzen karşılaştırması">
      <h2>{describeComparison(c)}</h2>
      <table>
        <caption>{c.reps} tekrarın ortalaması, her tekrarda iki düzen aynı müşterileri görür</caption>
        <thead>
          <tr><th scope="col">Ölçü</th><th scope="col">Ayrı kuyruk</th><th scope="col">Ortak kuyruk</th></tr>
        </thead>
        <tbody>
          <tr><th scope="row">ortalama bekleme</th><td className="num">{sec(c.separate.meanWait.mean)}</td><td className="num">{sec(c.pooled.meanWait.mean)}</td></tr>
          <tr><th scope="row">%90 en fazla</th><td className="num">{sec(c.separate.waitP90)}</td><td className="num">{sec(c.pooled.waitP90)}</td></tr>
          <tr><th scope="row">bekleyen müşteri payı</th><td className="num">{pct(c.separate.probWait)}</td><td className="num">{pct(c.pooled.probWait)}</td></tr>
          <tr><th scope="row">kasa doluluğu</th><td className="num">{pct(c.separate.utilization)}</td><td className="num">{pct(c.pooled.utilization)}</td></tr>
        </tbody>
      </table>
      <p className="fine num">
        ortak kuyruğun ortalama beklemeye etkisi: {signed(effect)} · %95 aralık [{signed(lo)} , {signed(hi)}]
      </p>
    </section>
  )
}
