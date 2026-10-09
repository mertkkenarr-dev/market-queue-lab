import type { StaffingRow } from '../lib/staffing'

const W = 720
const H = 260
const M = { l: 40, r: 16, t: 16, b: 32 }
const MAX_LANES = 10

/** Saat saat önerilen kasa sayısı: ortalama gün (kalın) ve yoğun gün (kesikli). Sağlanamayan saatler üstte işaretlenir. */
export function StaffChart({ average, busy }: { average: readonly StaffingRow[]; busy: readonly StaffingRow[] }) {
  const hours = average.map((r) => r.hour)
  if (hours.length === 0) return null
  const x0 = hours[0] as number
  const x1 = (hours[hours.length - 1] as number) + 1
  const x = (h: number): number => M.l + ((h - x0) / (x1 - x0)) * (W - M.l - M.r)
  const y = (v: number): number => H - M.b - (v / MAX_LANES) * (H - M.t - M.b)
  const path = (rows: readonly StaffingRow[]): string =>
    rows.map((r) => `${x(r.hour).toFixed(1)},${y(r.lanes ?? MAX_LANES).toFixed(1)} ${x(r.hour + 1).toFixed(1)},${y(r.lanes ?? MAX_LANES).toFixed(1)}`).join(' ')
  const label = `Saatlik önerilen kasa sayısı. Ortalama gün: ${average.map((r) => `${r.hour}:00 ${r.lanes ?? 'sağlanamıyor'}`).join(', ')}.`
  return (
    <figure className="chart">
      <figcaption>Önerilen açık kasa sayısı, saat saat</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {[0, 2, 4, 6, 8, 10].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className="grid" />
            <text x={M.l - 8} y={y(v) + 4} textAnchor="end" className="num axis">{v}</text>
          </g>
        ))}
        {hours.filter((h) => h % 2 === 0).map((h) => (
          <text key={h} x={x(h)} y={H - 8} textAnchor="middle" className="num axis">{String(h).padStart(2, '0')}:00</text>
        ))}
        <polyline points={path(busy)} className="series separate-jsq" />
        <polyline points={path(average)} className="series pooled" />
        {average.filter((r) => r.lanes === null).map((r) => (
          <text key={r.hour} x={(x(r.hour) + x(r.hour + 1)) / 2} y={M.t + 8} textAnchor="middle" className="tag">!</text>
        ))}
        <g transform={`translate(${M.l + 12}, ${M.t + 12})`}>
          <line x1="0" x2="24" y1="0" y2="0" className="series pooled" />
          <text x="32" y="4" className="tag">ortalama gün</text>
          <line x1="140" x2="164" y1="0" y2="0" className="series separate-jsq" />
          <text x="172" y="4" className="tag muted">yoğun gün (%90 üst dilim)</text>
        </g>
      </svg>
    </figure>
  )
}
