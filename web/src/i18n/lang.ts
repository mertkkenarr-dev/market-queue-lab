import type { Lang } from '../lib/format'

const KEY = 'kuyruk-lab-lang'

const browserLang = (): Lang => (navigator.language.toLowerCase().startsWith('tr') ? 'tr' : 'en')

/** Kayıtlı tercih, yoksa tarayıcı dili. Depolama kapalıysa (gizli pencere, önizleme) tarayıcı diline düşer. */
export function initialLang(): Lang {
  try {
    const saved = window.localStorage.getItem(KEY)
    return saved === 'tr' || saved === 'en' ? saved : browserLang()
  } catch {
    return browserLang()
  }
}

/** Tercihi kaydeder; depolama yoksa false döner ve dil yalnızca bu oturumda geçerli kalır. */
export function saveLang(lang: Lang): boolean {
  try {
    window.localStorage.setItem(KEY, lang)
    return true
  } catch {
    return false
  }
}
