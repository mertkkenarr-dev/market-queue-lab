import { num, signedPct, pct } from '../../lib/format'
import { scatterStats, type Tuple4 } from '../../lib/validationData'

interface Props {
  title: string
  unit: string
  rows: readonly Tuple4[]
}

const W = 340
const H = 300
const M = { l: 44, r: 12, t: 12, b: 40 }

/** Gerçek (x) ve simülasyon medyanı (y); dikey çubuk simülasyonun %90 aralığı. Kesikli çizgi: kusursuz uyum. */
export function Scatter({ title, unit, rows }: Props) {
  const s = scatterStats(rows)
  const vals = rows.flatMap(([r, lo, , hi]) => [r, lo, hi])
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const pad = (hi - lo) * 0.04
  const a = lo - pad
  const b = hi + pad
  const x = (v: number): number => M.l + ((v - a) / (b - a)) * (W - M.l - M.r)
  const y = (v: number): number => H - M.b - ((v - a) / (b - a)) * (H - M.t - M.b)
  const ticks = [0, 1, 2, 3].map((i) => a + ((b - a) * i) / 3)
  return (
    <figure className="scatter">
      <figcaption>{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${s.n} saat. Yanlılık ${signedPct(s.biasPct)}, ortalama mutlak hata ${pct(s.mapePct)}, %90 aralığın kapsaması ${pct(s.coveragePct, 0)}.`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={M.l - 6} y={y(t) + 4} textAnchor="end" className="num axis">{num(t, hi < 5 ? 2 : 0)}</text>
            <text x={x(t)} y={H - M.b + 16} textAnchor="middle" className="num axis">{num(t, hi < 5 ? 2 : 0)}</text>
          </g>
        ))}
        <line x1={x(a)} y1={y(a)} x2={x(b)} y2={y(b)} className="ideal" />
        {rows.map(([real, l, med, h], i) => (
          <g key={i}>
            <line x1={x(real)} x2={x(real)} y1={y(l)} y2={y(h)} className="interval" />
            <circle cx={x(real)} cy={y(med)} r="2.5" className="pt" />
          </g>
        ))}
        <text x={(M.l + W - M.r) / 2} y={H - 4} textAnchor="middle" className="axis">gerçek ({unit})</text>
        <text x={12} y={(M.t + H - M.b) / 2} textAnchor="middle" className="axis" transform={`rotate(-90 12 ${(M.t + H - M.b) / 2})`}>simülasyon</text>
      </svg>
      <p className="scatter-stats num">n={s.n} · yanlılık {signedPct(s.biasPct)} · hata {pct(s.mapePct)} · %90 aralık kapsaması {pct(s.coveragePct, 0)}</p>
    </figure>
  )
}
