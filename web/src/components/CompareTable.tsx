import { describeComparison, type PairedComparison, type Rival } from '../lib/compare'
import { LAYOUT_NAME, LAYOUTS } from '../lib/layoutNames'

const sec = (s: number): string => (s >= 60 ? `${Math.floor(s / 60)} dk ${String(Math.round(s % 60)).padStart(2, '0')} sn` : `${Math.round(s)} sn`)
const pct = (v: number): string => `%${Math.round(v * 100)}`
const signed = (s: number): string => `${s > 0 ? '+' : s < 0 ? '−' : ''}${sec(Math.abs(s))}`
const RIVALS: Rival[] = ['separate-random', 'separate-jsq']

/** Birden çok tekrarın ortalaması: tek bir oynatma şans eseri uç olabilir, tablo bunu düzeltir. */
export function CompareTable({ c }: { c: PairedComparison }) {
  return (
    <section className="compare-table" aria-label="Düzen karşılaştırması">
      <h2>{describeComparison(c)}</h2>
      <table>
        <caption>{c.reps} tekrarın ortalaması, her tekrarda üç düzen aynı müşterileri görür</caption>
        <thead>
          <tr>
            <th scope="col">Ölçü</th>
            {LAYOUTS.map((k) => <th key={k} scope="col">{LAYOUT_NAME[k]}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr><th scope="row">ortalama bekleme</th>{LAYOUTS.map((k) => <td key={k} className="num">{sec(c.layouts[k].meanWait.mean)}</td>)}</tr>
          <tr><th scope="row">%90 en fazla</th>{LAYOUTS.map((k) => <td key={k} className="num">{sec(c.layouts[k].waitP90)}</td>)}</tr>
          <tr><th scope="row">bekleyen müşteri payı</th>{LAYOUTS.map((k) => <td key={k} className="num">{pct(c.layouts[k].probWait)}</td>)}</tr>
          <tr><th scope="row">kasa doluluğu</th>{LAYOUTS.map((k) => <td key={k} className="num">{pct(c.layouts[k].utilization)}</td>)}</tr>
        </tbody>
      </table>
      <ul className="fine num">
        {RIVALS.map((k) => {
          const d = c.vsPooled[k]
          return (
            <li key={k}>
              ortak kuyruğun etkisi ({LAYOUT_NAME[k].toLowerCase()} karşısında): {signed(-d.mean)} · %95 aralık [{signed(-d.ciHigh)} , {signed(-d.ciLow)}]
            </li>
          )
        })}
      </ul>
    </section>
  )
}
