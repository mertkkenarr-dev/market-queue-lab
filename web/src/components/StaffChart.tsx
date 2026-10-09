import { useI18n } from '../i18n/context'
import type { StaffingRow } from '../lib/staffing'

const W = 720
const H = 260
const M = { l: 40, r: 16, t: 16, b: 32 }
const MAX_LANES = 10

interface Props {
  average: readonly StaffingRow[]
  busy: readonly StaffingRow[]
  /** Mağazanın o saatte gerçekte açtığı ortalama kasa (Mart–Nisan 2019, kasiyer kayıtları), saat -> kasa. */
  observed?: Readonly<Record<string, number>>
}

/**
 * Saat saat önerilen kasa sayısı: ortalama gün (kalın) ve yoğun gün (kesikli); noktalar mağazanın gerçekte açtığı.
 * Sağlanamayan saatler üstte işaretlenir.
 */
export function StaffChart({ average, busy, observed }: Props) {
  const { t } = useI18n()
  const s = t.staffing
  const hours = average.map((r) => r.hour)
  if (hours.length === 0) return null
  const x0 = hours[0] as number
  const x1 = (hours[hours.length - 1] as number) + 1
  const x = (h: number): number => M.l + ((h - x0) / (x1 - x0)) * (W - M.l - M.r)
  const y = (v: number): number => H - M.b - (v / MAX_LANES) * (H - M.t - M.b)
  const path = (rows: readonly StaffingRow[]): string =>
    rows.map((r) => `${x(r.hour).toFixed(1)},${y(r.lanes ?? MAX_LANES).toFixed(1)} ${x(r.hour + 1).toFixed(1)},${y(r.lanes ?? MAX_LANES).toFixed(1)}`).join(' ')
  const label = s.chartAria(average.map((r) => `${r.hour}:00 ${r.lanes ?? s.unattainable}`).join(', '))
  return (
    <figure className="chart">
      <figcaption>{s.chartCaption}</figcaption>
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
        <polyline points={path(busy)} className="series plan-busy" />
        <polyline points={path(average)} className="series plan-avg" />
        {observed && hours.map((h) => (observed[String(h)] === undefined ? null : (
          <circle key={h} cx={(x(h) + x(h + 1)) / 2} cy={y(observed[String(h)] as number)} r="5" className="observed" />
        )))}
        {average.filter((r) => r.lanes === null).map((r) => (
          <text key={r.hour} x={(x(r.hour) + x(r.hour + 1)) / 2} y={M.t + 8} textAnchor="middle" className="tag">!</text>
        ))}
      </svg>
      <p className="legend">
        <span><svg width="28" height="10" aria-hidden="true"><line x1="0" x2="28" y1="5" y2="5" className="series plan-avg" /></svg>{s.legendAvg}</span>
        <span><svg width="28" height="10" aria-hidden="true"><line x1="0" x2="28" y1="5" y2="5" className="series plan-busy" /></svg>{s.legendBusy}</span>
        {observed && <span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5" className="observed" /></svg>{s.legendObserved}</span>}
      </p>
    </figure>
  )
}
