import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { makeFormat, type Format, type Lang } from '../lib/format'
import { initialLang, saveLang } from './lang'
import { UI, type Ui } from './ui'

interface I18n {
  lang: Lang
  setLang: (l: Lang) => void
  t: Ui
  f: Format
}

const Ctx = createContext<I18n | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = UI[lang].meta.title
  }, [lang])
  const value = useMemo<I18n>(() => ({
    lang,
    setLang: (l) => {
      saveLang(l)
      setLangState(l)
    },
    t: UI[lang],
    f: makeFormat(lang),
  }), [lang])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n(): I18n {
  const v = useContext(Ctx)
  if (!v) throw new Error('useI18n LangProvider dışında kullanıldı')
  return v
}
