const nf = (d: number) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d })
export const num = (v: number, d = 1): string => nf(d).format(v)
export const pct = (v: number, d = 1): string => `%${num(v, d)}`
export const signedPct = (v: number, d = 1): string => {
  const shown = Number(Math.abs(v).toFixed(d))
  return `${shown === 0 ? '' : v > 0 ? '+' : '−'}%${num(shown, d)}`
}
