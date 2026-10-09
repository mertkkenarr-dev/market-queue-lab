import { useI18n } from '../../i18n/context'
import type { ValidationData } from '../../lib/validationData'

const CLIP = 60
const FOLD_CLASS = ['f0', 'f1', 'f2']

/** Her ölçü için üç kayan-başlangıç katının yanlılığı. ±%60 dışı kırpılır ve gerçek değer yazılır (aksi halde sayı grafiği ezerdi). */
export function BiasBars({ holdout }: { holdout: ValidationData['holdout'] }) {
  const { t, f } = useI18n()
  const folds = Object.keys(holdout)
  const labels = Object.keys(holdout[folds[0] as string] ?? {})
  const rowH = 54
  const W = 720
  const left = 250
  const mid = left + (W - left - 16) / 2
  const sx = (v: number): number => mid + (Math.max(-CLIP, Math.min(CLIP, v)) / CLIP) * ((W - left - 16) / 2)
  return (
    <figure className="chart">
      <figcaption>{t.validationUi.biasCaption}</figcaption>
      <svg viewBox={`0 0 ${W} ${labels.length * rowH + 40}`} role="img" aria-label={t.validationUi.biasAria}>
        <line x1={mid} x2={mid} y1="8" y2={labels.length * rowH + 8} className="playhead" />
        {labels.map((label, i) => (
          <g key={label} transform={`translate(0, ${i * rowH + 12})`}>
            <text x={left - 12} y="22" textAnchor="end" className="tag">{t.validationUi.metricLabel(label)}</text>
            {folds.map((fold, k) => {
              const v = (holdout[fold]?.[label]?.bias_pct ?? 0)
              const x0 = Math.min(mid, sx(v))
              return (
                <g key={fold} transform={`translate(0, ${k * 14})`}>
                  <rect x={x0} y="0" width={Math.max(1, Math.abs(sx(v) - mid))} height="10" className={`bar ${FOLD_CLASS[k] ?? ''}`} />
                  <text x={v >= 0 ? sx(v) + 4 : sx(v) - 4} y="9" textAnchor={v >= 0 ? 'start' : 'end'} className="num axis">{f.signedPct(v)}</text>
                </g>
              )
            })}
          </g>
        ))}
        <g transform={`translate(${left}, ${labels.length * rowH + 28})`}>
          {folds.map((fold, k) => (
            <g key={fold} transform={`translate(${k * 150}, 0)`}>
              <rect x="0" y="-9" width="14" height="10" className={`bar ${FOLD_CLASS[k] ?? ''}`} />
              <text x="20" y="0" className="tag">{fold}</text>
            </g>
          ))}
        </g>
      </svg>
    </figure>
  )
}
