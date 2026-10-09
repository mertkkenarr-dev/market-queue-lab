export type Lang = 'tr' | 'en'

export interface Format {
  num: (v: number, d?: number) => string
  /** Yüzde değeri (0–100 ölçeğinde): tr "%7,3", en "7.3%". */
  pct: (v: number, d?: number) => string
  /** 0–1 oranını yüzdeye çevirir. */
  share: (v: number, d?: number) => string
  signedPct: (v: number, d?: number) => string
  /** Bekleme süresi: "42 sn" / "3 dk 05 sn". Negatif değer işaretsiz yazılır; işareti çağıran koyar. */
  wait: (s: number) => string
  /** İşaretli süre farkı: "+12 sn", "−1 dk 05 sn"; sıfıra yuvarlanınca işaretsiz. */
  delta: (s: number) => string
  /** Saat başından geçen saniyeyi duvar saatine çevirir: (17, 930) -> "17:15". */
  clock: (hour: number, t: number) => string
}

const UNITS: Record<Lang, { min: string; sec: string; locale: string }> = {
  tr: { min: 'dk', sec: 'sn', locale: 'tr-TR' },
  en: { min: 'min', sec: 's', locale: 'en-US' },
}

const clock = (hour: number, t: number): string => {
  const total = hour * 60 + Math.floor(t / 60)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

const cache = new Map<Lang, Format>()

/** Dile göre sayı ve süre biçimleri. Türkçede yüzde işareti önde, ondalık virgül; İngilizcede tersi. */
export function makeFormat(lang: Lang): Format {
  const hit = cache.get(lang)
  if (hit) return hit
  const u = UNITS[lang]
  const nf = new Map<number, Intl.NumberFormat>()
  const num = (v: number, d = 1): string => {
    let f = nf.get(d)
    if (!f) nf.set(d, (f = new Intl.NumberFormat(u.locale, { minimumFractionDigits: d, maximumFractionDigits: d })))
    return f.format(v)
  }
  const pct = (v: number, d = 1): string => (lang === 'tr' ? `%${num(v, d)}` : `${num(v, d)}%`)
  const wait = (s: number): string => {
    const a = Math.round(Math.abs(s))
    return a >= 60 ? `${Math.floor(a / 60)} ${u.min} ${String(a % 60).padStart(2, '0')} ${u.sec}` : `${a} ${u.sec}`
  }
  const format: Format = {
    num,
    pct,
    share: (v, d = 0) => pct(v * 100, d),
    signedPct: (v, d = 1) => {
      const shown = Number(Math.abs(v).toFixed(d))
      return `${shown === 0 ? '' : v > 0 ? '+' : '−'}${pct(shown, d)}`
    },
    wait,
    delta: (s) => {
      const r = Math.round(s)
      return `${r > 0 ? '+' : r < 0 ? '−' : ''}${wait(r)}`
    },
    clock,
  }
  cache.set(lang, format)
  return format
}

const tr = makeFormat('tr')
export const { num, pct, signedPct } = tr
export const fmtWait = tr.wait
export const fmtDelta = tr.delta
export { clock }
