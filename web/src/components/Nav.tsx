import { useI18n } from '../i18n/context'

export type ViewId = 'hikaye' | 'lab' | 'kasa' | 'dogrulama' | 'yontem'

const ITEMS: { id: ViewId; key: 'story' | 'lab' | 'staffing' | 'validation' | 'method'; hash: string }[] = [
  { id: 'hikaye', key: 'story', hash: '#/' },
  { id: 'lab', key: 'lab', hash: '#/lab' },
  { id: 'kasa', key: 'staffing', hash: '#/kasa' },
  { id: 'dogrulama', key: 'validation', hash: '#/dogrulama' },
  { id: 'yontem', key: 'method', hash: '#/yontem' },
]

export const viewFromHash = (hash: string): ViewId => ITEMS.find((i) => i.hash === (hash || '#/'))?.id ?? 'hikaye'

export function Nav({ view }: { view: ViewId }) {
  const { t, lang, setLang } = useI18n()
  return (
    <div className="top-right">
      <nav className="nav" aria-label={t.nav.aria}>
        {ITEMS.map((i) => (
          <a key={i.id} href={i.hash} aria-current={view === i.id ? 'page' : undefined}>{t.nav[i.key]}</a>
        ))}
      </nav>
      <div className="lang" role="radiogroup" aria-label={t.lang.aria}>
        {(['tr', 'en'] as const).map((l) => (
          <button key={l} type="button" role="radio" aria-checked={lang === l} lang={l} onClick={() => setLang(l)}>
            {l === 'tr' ? 'TR' : 'EN'}
          </button>
        ))}
      </div>
    </div>
  )
}
