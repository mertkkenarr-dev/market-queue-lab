import { useI18n } from '../../i18n/context'
import type { HeroData } from '../../lib/hero'
import { linear } from '../../lib/scale'
import type { ModelKind } from '../../types/scenario'

const W = 1120
const H = 330
const MID = H / 2
const PAD = { l: 8, r: 8, gap: 6, edge: 26 }
const DRAW_SECONDS = 1.4

interface Props {
  data: HeroData
  hour: number
  model: ModelKind
}

/**
 * Her çizgi bir müşteri: yatay konum varış anı, uzunluk beklediği süre. Üstte ayrı kuyruklar, altta aynı
 * müşteriler tek ortak kuyrukta. Çizgiler varış sırasıyla bir kez çizilir (sayfanın tek hareketi).
 */
export function HeroBarcode({ data, hour, model }: Props) {
  const { t, f } = useI18n()
  const pooled = data.pooled[model]
  const maxWait = Math.max(60, ...data.separate.wait, ...data.pooled.saha.wait, ...data.pooled.ders.wait)
  const x = linear(0, 3600, PAD.l, W - PAD.r)
  const len = linear(0, maxWait, 0, MID - PAD.gap - PAD.edge)
  const barW = Math.max(1.2, ((W - PAD.l - PAD.r) / Math.max(1, data.customers)) * 0.9)
  const label = t.charts.barcodeAria(data.customers, f.wait(data.separate.meanWait), f.wait(pooled.meanWait))

  return (
    <figure className="barcode" aria-label={label}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <line x1={PAD.l} x2={W - PAD.r} y1={MID} y2={MID} className="barcode-axis" />
        <g className="barcode-bars separate">
          {Array.from(data.separate.wait, (w, i) => {
            const h = Math.max(1, len(w))
            const xi = x(data.separate.arrival[i] as number)
            return <rect key={i} x={xi} y={MID - PAD.gap - h} width={barW} height={h} style={{ animationDelay: `${((xi / W) * DRAW_SECONDS).toFixed(3)}s` }} />
          })}
        </g>
        <g className="barcode-bars pooled" key={model}>
          {Array.from(pooled.wait, (w, i) => {
            const h = Math.max(1, len(w))
            const xi = x(pooled.arrival[i] as number)
            return <rect key={i} x={xi} y={MID + PAD.gap} width={barW} height={h} style={{ animationDelay: `${((xi / W) * DRAW_SECONDS).toFixed(3)}s` }} />
          })}
        </g>
      </svg>
      <div className="barcode-ticks num" aria-hidden="true">
        {[0, 15, 30, 45, 60].map((m) => (
          <span key={m} style={{ left: `${(x(m * 60) / W) * 100}%` }}>{f.clock(hour, m * 60)}</span>
        ))}
      </div>
    </figure>
  )
}
