import { pooledWalkSeconds, POOLED_SLOWDOWN } from '@sim/field'
import { BreakEvenChart } from '../components/story/BreakEvenChart'
import { FieldChart } from '../components/story/FieldChart'
import { GapChart } from '../components/story/GapChart'
import { Hero } from '../components/story/Hero'
import { STORY } from '../content/story'
import type { StoryNumbers } from '../content/story.types'
import raw from '../data/validation.json'
import { useI18n } from '../i18n/context'
import { loadParams } from '../lib/params'
import { parseValidation } from '../lib/validationData'

const state = parseValidation(raw)
const params = loadParams()

export default function StoryView() {
  const { lang, t, f } = useI18n()
  if (state.status === 'error') return <div className="state"><h1>{t.errors.validation}</h1><p>{state.message}</p></div>
  if (params.status === 'error') return <div className="state"><h1>{t.errors.params}</h1><p>{params.message}</p></div>
  const d = state.data
  const c = STORY[lang]
  const five = d.field.rows.filter((r) => r.lanes === 5)
  const flip = five.find((r) => r.field > 0)
  const walk = pooledWalkSeconds(5)
  const gap = d.gaps.cdf.find((r) => r[0] >= d.gaps.shortSeconds)
  const s = d.store
  const n: StoryNumbers = {
    gapSec: d.gaps.shortSeconds,
    gapReal: gap ? f.share(gap[1]) : '—',
    gapSim: gap ? f.share(gap[2]) : '—',
    lanesProxy: f.num(s.lanesProxyMean, 1),
    lanesLogs: f.num(s.lanesLogsMean, 1),
    walkMin: f.num(Math.min(...walk), 1),
    walkMax: f.num(Math.max(...walk), 1),
    slowdown: f.pct(POOLED_SLOWDOWN * 100, 2),
    flip: flip ? f.share(flip.rho) : '—',
    occP25: f.share(s.occupancyP25),
    occP75: f.share(s.occupancyP75),
    occMed: f.share(s.occupancyMedian),
    probWaitMed: f.share(s.probWaitMedian),
    p90Med: f.wait(s.p90Median),
    p90Over2: f.share(s.p90Over2min),
  }

  return (
    <article className="story">
      <Hero params={params.params} copy={c.hero} />

      <section className="chapter" aria-labelledby="s-problem">
        <h2 id="s-problem">{c.problem.title}</h2>
        {c.problem.body}
      </section>

      <section className="chapter" aria-labelledby="s-approach">
        <h2 id="s-approach">{c.approach.title}</h2>
        <ol className="steps">
          {c.approach.steps.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
        <p className="fine">{c.approach.reproducible}</p>
      </section>

      <section className="chapter" aria-labelledby="s-data">
        <h2 id="s-data">{c.changeover.title}</h2>
        {c.changeover.body(n)}
        <GapChart cdf={d.gaps.cdf} shortSeconds={d.gaps.shortSeconds} />
        <p className="aside">{c.changeover.aside(n)}</p>
      </section>

      <section className="chapter" aria-labelledby="s-field">
        <h2 id="s-field">{c.field.title}</h2>
        {c.field.body(n)}
        <FieldChart rows={five} storeBand={[s.occupancyP25, s.occupancyP75]} />
        <p className="fine">{c.field.fine}</p>
      </section>

      <section className="chapter" aria-labelledby="s-breakeven">
        <h2 id="s-breakeven">{c.breakEven.title}</h2>
        {c.breakEven.body}
        <BreakEvenChart rows={d.field.rows} />
      </section>

      <section className="chapter" aria-labelledby="s-store">
        <h2 id="s-store">{c.store.title}</h2>
        {c.store.body(n)}
      </section>

      <section className="chapter" aria-labelledby="s-limits">
        <h2 id="s-limits">{c.limits.title}</h2>
        {c.limits.intro}
        <ul className="claims">{c.limits.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
        <p><strong>{c.limits.nextTitle}</strong></p>
        <ul className="claims">{c.limits.next.map((it, i) => <li key={i}>{it}</li>)}</ul>
        <p>{c.limits.closing}</p>
        <ul className="links">
          <li><a href="#/dogrulama">{c.limits.links.validation}</a></li>
          <li><a href="#/yontem">{c.limits.links.method}</a></li>
        </ul>
      </section>
    </article>
  )
}
