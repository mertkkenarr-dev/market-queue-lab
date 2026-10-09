import { useI18n } from '../../i18n/context'

const axisSec = (v: number): string => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v))}`
import { linear, niceTicks } from '../../lib/scale'
import type { FieldRow } from '../../lib/validationData'

const W = 720
const H = 380
const M = { l: 48, r: 112, t: 28, b: 44 }

interface Props {
  rows: readonly FieldRow[]
  /** Bu mağazanın saatlerinin ortadaki yarısında kasa doluluğu (çeyrekler arası). */
  storeBand: [number, number]
}

/**
 * Dikey eksen: tek ortak kuyruğun ortalama beklemesi eksi ayrı kuyrukların (aynı müşteriler, 200 tekrar).
 * Sıfırın altı ortak kuyruğun kazandığı bölge. Bant %95 güven aralığı.
 */
export function FieldChart({ rows, storeBand }: Props) {
  const { t, f } = useI18n()
  const c = t.charts.field
  const lo = Math.min(-20, ...rows.map((r) => r.textbookLo))
  const hi = Math.max(20, ...rows.map((r) => r.fieldHi))
  const x = linear(0.5, 0.95, M.l, W - M.r)
  const y = linear(lo, hi, H - M.b, M.t)
  const path = (f: (r: FieldRow) => number) => rows.map((r, i) => `${i ? 'L' : 'M'}${x(r.rho).toFixed(1)},${y(f(r)).toFixed(1)}`).join('')
  const band = (a: (r: FieldRow) => number, b: (r: FieldRow) => number) => `${path(a)}${[...rows].reverse().map((r) => `L${x(r.rho).toFixed(1)},${y(b(r)).toFixed(1)}`).join('')}Z`
  const last = rows[rows.length - 1]
  const cross = rows.find((r) => r.field > 0)
  const label = c.aria(f.delta(Math.min(...rows.map((r) => r.textbook))), cross ? f.share(cross.rho) : '—')

  return (
    <figure className="plot">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <rect x={x(storeBand[0])} y={M.t} width={Math.max(0, x(Math.min(0.95, storeBand[1])) - x(storeBand[0]))} height={H - M.t - M.b} className="store-band" />
        <text x={x(storeBand[0]) - 6} y={M.t + 14} textAnchor="end" className="plot-note">{c.storeBand}</text>
        {niceTicks(lo, hi, 5).map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className={v === 0 ? 'zero' : 'grid'} />
            <text x={M.l - 8} y={y(v) + 4} textAnchor="end" className="num axis">{axisSec(v)}</text>
          </g>
        ))}
        {[0.5, 0.6, 0.7, 0.8, 0.9].map((v) => <text key={v} x={x(v)} y={H - M.b + 20} textAnchor="middle" className="num axis">{f.share(v)}</text>)}
        <text x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle" className="axis">{c.axisX}</text>
        <path d={band((r) => r.textbookLo, (r) => r.textbookHi)} className="ci separate-ci" />
        <path d={band((r) => r.fieldLo, (r) => r.fieldHi)} className="ci pooled-ci" />
        <path d={path((r) => r.textbook)} className="line textbook" />
        <path d={path((r) => r.walkOnly)} className="line walk" />
        <path d={path((r) => r.field)} className="line field" />
        {last && (
          <>
            <text x={x(last.rho) + 8} y={y(last.field) + 4} className="end-label field-label">{c.field}</text>
            <text x={x(last.rho) + 8} y={y(last.walkOnly) + 4} className="end-label walk-label">{c.walk}</text>
            <text x={x(last.rho) + 8} y={y(last.textbook) + 4} className="end-label">{c.textbook}</text>
          </>
        )}
        <text x={M.l - 8} y={M.t - 12} textAnchor="end" className="axis">{t.validationUi.units.seconds}</text>
      </svg>
      <figcaption>{c.caption}</figcaption>
    </figure>
  )
}
