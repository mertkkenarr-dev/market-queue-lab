import { useI18n } from '../../i18n/context'
import { linear } from '../../lib/scale'

const W = 720
const H = 300
const M = { l: 48, r: 24, t: 16, b: 44 }

interface Props {
  /** [saniye, gerçek birikimli pay, simülasyon birikimli pay] */
  cdf: readonly (readonly [number, number, number])[]
  shortSeconds: number
}

/** Kasiyerin iki müşteri arası boşluğu: gerçek (görülmemiş dönem) ve simülasyon, birikimli dağılım. */
export function GapChart({ cdf, shortSeconds }: Props) {
  const { t, f } = useI18n()
  const c = t.charts.gap
  const maxX = 120
  const x = linear(0, maxX, M.l, W - M.r)
  const y = linear(0, 1, H - M.b, M.t)
  const path = (k: 1 | 2) => cdf.filter((r) => r[0] < maxX).map((r, i) => `${i ? 'L' : 'M'}${x(r[0]).toFixed(1)},${y(r[k]).toFixed(1)}`).join('')
  const atShort = cdf.find((r) => r[0] >= shortSeconds)
  const label = c.aria(shortSeconds, atShort ? f.share(atShort[1]) : '—', atShort ? f.share(atShort[2]) : '—')
  return (
    <figure className="plot">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className="grid" />
            <text x={M.l - 8} y={y(v) + 4} textAnchor="end" className="num axis">{f.share(v)}</text>
          </g>
        ))}
        {[0, 15, 30, 60, 90, 120].map((v) => <text key={v} x={x(v)} y={H - M.b + 20} textAnchor="middle" className="num axis">{v === 120 ? '120+' : v}</text>)}
        <text x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle" className="axis">{c.axisX}</text>
        <line x1={x(shortSeconds)} x2={x(shortSeconds)} y1={M.t} y2={H - M.b} className="measured" />
        <path d={path(1)} className="line real" />
        <path d={path(2)} className="line sim" />
        <text x={x(70)} y={y(0.78)} className="end-label">{c.real}</text>
        <text x={x(70)} y={y(0.78) + 18} className="end-label sim-label">{c.sim}</text>
      </svg>
    </figure>
  )
}
