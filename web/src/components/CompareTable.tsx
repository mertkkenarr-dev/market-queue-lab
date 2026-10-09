import { useI18n } from '../i18n/context'
import { describeComparison, type PairedComparison, type Rival } from '../lib/compare'
import { LAYOUTS } from '../lib/layoutNames'

const RIVALS: Rival[] = ['separate-random', 'separate-jsq']

/** Birden çok tekrarın ortalaması: tek bir oynatma şans eseri uç olabilir, tablo bunu düzeltir. */
export function CompareTable({ c }: { c: PairedComparison }) {
  const { t, f } = useI18n()
  const w = t.compare
  return (
    <section className="compare-table" aria-label={w.aria}>
      <h2>{describeComparison(c, w, f)}</h2>
      <div className="table-scroll">
        <table>
          <caption>{w.caption(c.reps)}</caption>
          <thead>
            <tr>
              <th scope="col">{w.metric}</th>
              {LAYOUTS.map((k) => <th key={k} scope="col">{t.layout[k]}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr><th scope="row">{w.rows.meanWait}</th>{LAYOUTS.map((k) => <td key={k} className="num">{f.wait(c.layouts[k].meanWait.mean)}</td>)}</tr>
            <tr><th scope="row">{w.rows.p90}</th>{LAYOUTS.map((k) => <td key={k} className="num">{f.wait(c.layouts[k].waitP90)}</td>)}</tr>
            <tr><th scope="row">{w.rows.probWait}</th>{LAYOUTS.map((k) => <td key={k} className="num">{f.share(c.layouts[k].probWait)}</td>)}</tr>
            <tr><th scope="row">{w.rows.occupancy}</th>{LAYOUTS.map((k) => <td key={k} className="num">{f.share(c.layouts[k].utilization)}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <ul className="fine">
        {RIVALS.map((k) => {
          const d = c.vsPooled[k]
          return <li key={k}>{w.effect(t.layout[k], f.delta(-d.mean), f.delta(-d.ciHigh), f.delta(-d.ciLow))}</li>
        })}
      </ul>
    </section>
  )
}
