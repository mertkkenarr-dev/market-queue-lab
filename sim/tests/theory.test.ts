import { describe, expect, it } from 'vitest'
import { erlangB, erlangC, mg1, mmc } from '../src/theory'

describe('theory', () => {
  it('Erlang-C for one server equals rho', () => {
    expect(erlangC(1, 0.6)).toBeCloseTo(0.6, 12)
  })

  it('Erlang-C(c=2, a=1) = 1/3 (hand-derived)', () => {
    expect(erlangB(2, 1)).toBeCloseTo(0.2, 12)
    expect(erlangC(2, 1)).toBeCloseTo(1 / 3, 12)
  })

  it('M/M/1 mean wait is rho/(mu - lambda)', () => {
    const m = mmc(0.7, 1, 1)
    expect(m.meanWait).toBeCloseTo(0.7 / 0.3, 12)
    expect(m.meanInSystem).toBeCloseTo(0.7 / 0.3, 12) // L = rho/(1-rho)
  })

  it('Little holds inside the formulas', () => {
    const m = mmc(2.4, 1, 3)
    expect(m.meanInSystem).toBeCloseTo(2.4 * m.meanSojourn, 12)
  })

  it('M/D/1 wait is half of M/M/1 (Pollaczek-Khinchine)', () => {
    const exp = mmc(0.8, 1, 1).meanWait
    const det = mg1(0.8, 1, 0).meanWait
    expect(det).toBeCloseTo(exp / 2, 12)
  })

  it('rejects unstable systems', () => {
    expect(() => mmc(3, 1, 3)).toThrow()
    expect(() => mg1(1, 1.2, 0)).toThrow()
  })
})
