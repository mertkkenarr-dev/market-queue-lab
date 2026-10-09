import { useI18n } from '../../i18n/context'
import { linear } from '../../lib/scale'
import type { FieldRow } from '../../lib/validationData'

const W = 720
const H = 320
const M = { l: 48, r: 96, t: 20, b: 44 }
const MEASURED = 0.0686

/** Yürüme hesaba katılınca, ortak kuyruğun hâlâ kazanması için kasiyerlerin en fazla ne kadar yavaşlayabileceği. */
export function BreakEvenChart({ rows }: { rows: readonly FieldRow[] }) {
  const { t, f } = useI18n()
  const c = t.charts.breakEven
  const lanes = [...new Set(rows.map((r) => r.lanes))].sort((a, b) => a - b)
  const x = linear(0.5, 0.95, M.l, W - M.r)
  const y = linear(0, 0.14, H - M.b, M.t)
  const at = (c: number) => rows.filter((r) => r.lanes === c)
  const path = (c: number) => at(c).map((r, i) => `${i ? 'L' : 'M'}${x(r.rho).toFixed(1)},${y(r.breakEven).toFixed(1)}`).join('')
  const five = at(5)
  const crossing = five.find((r) => r.breakEven < MEASURED)
  const label = c.aria(crossing ? f.share(crossing.rho) : '—')
  return (
    <figure className="plot">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {[0, 0.04, 0.08, 0.12].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className="grid" />
            <text x={M.l - 8} y={y(v) + 4} textAnchor="end" className="num axis">{f.share(v)}</text>
          </g>
        ))}
        {[0.5, 0.6, 0.7, 0.8, 0.9].map((v) => <text key={v} x={x(v)} y={H - M.b + 20} textAnchor="middle" className="num axis">{f.share(v)}</text>)}
        <text x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle" className="axis">{c.axisX}</text>
        <line x1={M.l} x2={W - M.r} y1={y(MEASURED)} y2={y(MEASURED)} className="measured" />
        <text x={W - M.r + 8} y={y(MEASURED) + 4} className="end-label field-label">{c.measured(f.pct(MEASURED * 100, 1))}</text>
        {lanes.map((n, i) => <path key={n} d={path(n)} className={`line lanes-${i}`} />)}
      </svg>
      <figcaption>
        {c.caption}
        <span className="legend">
          {lanes.map((n, i) => (
            <span key={n}><svg width="28" height="10" aria-hidden="true"><line x1="0" x2="28" y1="5" y2="5" className={`line lanes-${i}`} /></svg>{c.lanes(n)}</span>
          ))}
        </span>
      </figcaption>
    </figure>
  )
}
