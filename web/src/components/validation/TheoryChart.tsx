import { useI18n } from '../../i18n/context'
import { worstTheoryGapPct, type ValidationData } from '../../lib/validationData'

const W = 230
const H = 190
const M = { l: 34, r: 8, t: 10, b: 28 }

function Panel({ c, rows }: { c: string; rows: ValidationData['theory'][string] }) {
  const { t, f } = useI18n()
  const v = t.validationUi
  const maxY = Math.max(...rows.map((r) => Math.max(r.theory, r.hi)))
  const x = (rho: number): number => M.l + ((rho - 0.25) / 0.7) * (W - M.l - M.r)
  const y = (v: number): number => H - M.b - (v / maxY) * (H - M.t - M.b)
  return (
    <figure className="theory-panel">
      <figcaption>{v.theoryPanel(c)}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={v.theoryAria(c)}>
        <line x1={M.l} x2={W - M.r} y1={y(0)} y2={y(0)} className="grid" />
        <polyline points={rows.map((r) => `${x(r.rho)},${y(r.theory)}`).join(' ')} className="series pooled" />
        {rows.map((r) => (
          <g key={r.rho}>
            <line x1={x(r.rho)} x2={x(r.rho)} y1={y(r.lo)} y2={y(r.hi)} className="interval" />
            <circle cx={x(r.rho)} cy={y(r.sim)} r="3" className="pt" />
          </g>
        ))}
        {[0.3, 0.6, 0.9].map((r) => <text key={r} x={x(r)} y={H - 10} textAnchor="middle" className="num axis">{f.num(r, 1)}</text>)}
        <text x={M.l - 4} y={M.t + 4} textAnchor="end" className="num axis">{f.num(maxY, 0)}</text>
        <text x={(M.l + W - M.r) / 2} y={H - 0} textAnchor="middle" className="axis">{v.theoryAxis}</text>
      </svg>
    </figure>
  )
}

export function TheoryChart({ theory }: { theory: ValidationData['theory'] }) {
  const { t, f } = useI18n()
  return (
    <div>
      <div className="theory">
        {Object.entries(theory).map(([c, rows]) => <Panel key={c} c={c} rows={rows} />)}
      </div>
      <p className="scatter-stats">{t.validationUi.theoryStats(f.pct(worstTheoryGapPct(theory), 2))}</p>
    </div>
  )
}
