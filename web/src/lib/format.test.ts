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

describe('durations', () => {
  it('formats waits and signed deltas the same way everywhere', async () => {
    const { fmtWait, fmtDelta, clock } = await import('./format')
    expect(fmtWait(42.4)).toBe('42 sn')
    expect(fmtWait(185)).toBe('3 dk 05 sn')
    expect(fmtDelta(-65)).toBe('−1 dk 05 sn')
    expect(fmtDelta(0.3)).toBe('0 sn')
    expect(clock(17, 3600)).toBe('18:00')
  })
})

describe('english', () => {
  it('puts the percent sign after, uses a decimal point and English units', async () => {
    const { makeFormat } = await import('./format')
    const f = makeFormat('en')
    expect(f.num(1234.5, 1)).toBe('1,234.5')
    expect(f.pct(7.25)).toBe('7.3%')
    expect(f.signedPct(-3.2)).toBe('−3.2%')
    expect(f.wait(185)).toBe('3 min 05 s')
    expect(f.delta(12)).toBe('+12 s')
    expect(f.share(0.79)).toBe('79%')
  })
})
