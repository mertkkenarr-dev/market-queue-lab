import { useMemo, useState } from 'react'
import type { StoreParams } from '@sim/params'
import type { HeroCopy } from '../../content/story.types'
import { useI18n } from '../../i18n/context'
import { heroData } from '../../lib/hero'
import type { ModelKind } from '../../types/scenario'
import { HeroBarcode } from './HeroBarcode'

const DAY = 'fri'
const HOUR = 17
const LANES = 7
const SEED = 7

export function Hero({ params, copy }: { params: StoreParams; copy: HeroCopy }) {
  const { t, f } = useI18n()
  const [model, setModel] = useState<ModelKind>('saha')
  const data = useMemo(() => heroData(params, DAY, HOUR, LANES, SEED), [params])
  const pooled = data.pooled[model]
  const delta = pooled.meanWait - data.separate.meanWait

  return (
    <header className="hero">
      <h1>{copy.title}</h1>
      <p className="lede">{copy.lede}</p>
      <div className="hero-figure">
        <div className="hero-key">
          <p>{copy.key(LANES, data.customers)}</p>
          <div className="segmented" role="radiogroup" aria-label={copy.toggleAria}>
            {(['saha', 'ders'] as const).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={model === k} onClick={() => setModel(k)}>{t.modelLong[k]}</button>
            ))}
          </div>
        </div>
        <p className="barcode-label separate"><span>{copy.separate}</span> <strong className="num">{f.wait(data.separate.meanWait)}</strong></p>
        <HeroBarcode data={data} hour={HOUR} model={model} />
        <p className="barcode-label pooled">
          <span>{copy.pooled(model === 'ders')}</span> <strong className="num">{f.wait(pooled.meanWait)}</strong>
          <span className="delta">{copy.perCustomer} <span className="num">{f.delta(delta)}</span></span>
        </p>
      </div>
      <nav className="hero-actions" aria-label={t.nav.aria}>
        <a className="button primary" href="#/lab">{copy.watch}</a>
        <a className="button" href="#/dogrulama">{copy.validate}</a>
      </nav>
    </header>
  )
}
