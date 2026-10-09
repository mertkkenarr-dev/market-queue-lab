import { describe, expect, it } from 'vitest'
import { num, pct, signedPct } from './format'

describe('format', () => {
  it('uses Turkish decimal commas', () => {
    expect(num(1234.5, 1)).toBe('1.234,5')
    expect(pct(7.25)).toBe('%7,3')
  })
  it('shows no sign when the value rounds to zero', () => {
    expect(signedPct(-0.04)).toBe('%0,0')
    expect(signedPct(0.04)).toBe('%0,0')
  })
  it('shows a plus or a true minus sign otherwise', () => {
    expect(signedPct(12.7)).toBe('+%12,7')
    expect(signedPct(-3.2)).toBe('−%3,2')
  })
})
