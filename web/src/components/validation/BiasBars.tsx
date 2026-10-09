import { signedPct } from '../../lib/format'
import type { ValidationData } from '../../lib/validationData'

const CLIP = 60
const FOLD_CLASS = ['f0', 'f1', 'f2']

/** Her ölçü için üç kayan-başlangıç katının yanlılığı. ±%60 dışı kırpılır ve gerçek değer yazılır (aksi halde sayı grafiği ezerdi). */
export function BiasBars({ holdout }: { holdout: ValidationData['holdout'] }) {
  const folds = Object.keys(holdout)
  const labels = Object.keys(holdout[folds[0] as string] ?? {})
  const rowH = 54
  const W = 720
  const left = 250
  const mid = left + (W - left - 16) / 2
  const sx = (v: number): number => mid + (Math.max(-CLIP, Math.min(CLIP, v)) / CLIP) * ((W - left - 16) / 2)
  return (
    <figure className="chart">
      <figcaption>Simülasyon yanlılığı: aynı model, farklı dönemlerde farklı</figcaption>
      <svg viewBox={`0 0 ${W} ${labels.length * rowH + 40}`} role="img" aria-label="Üç kat için ölçü başına simülasyon yanlılığı yüzdesi">
        <line x1={mid} x2={mid} y1="8" y2={labels.length * rowH + 8} className="playhead" />
        {labels.map((label, i) => (
          <g key={label} transform={`translate(0, ${i * rowH + 12})`}>
            <text x={left - 12} y="22" textAnchor="end" className="tag">{label}</text>
            {folds.map((f, k) => {
              const v = (holdout[f]?.[label]?.bias_pct ?? 0)
              const x0 = Math.min(mid, sx(v))
              return (
                <g key={f} transform={`translate(0, ${k * 14})`}>
                  <rect x={x0} y="0" width={Math.max(1, Math.abs(sx(v) - mid))} height="10" className={`bar ${FOLD_CLASS[k] ?? ''}`} />
                  <text x={v >= 0 ? sx(v) + 4 : sx(v) - 4} y="9" textAnchor={v >= 0 ? 'start' : 'end'} className="num axis">{signedPct(v)}</text>
                </g>
              )
            })}
          </g>
        ))}
        <g transform={`translate(${left}, ${labels.length * rowH + 28})`}>
          {folds.map((f, k) => (
            <g key={f} transform={`translate(${k * 150}, 0)`}>
              <rect x="0" y="-9" width="14" height="10" className={`bar ${FOLD_CLASS[k] ?? ''}`} />
              <text x="20" y="0" className="tag">{f}</text>
            </g>
          ))}
        </g>
      </svg>
    </figure>
  )
}
