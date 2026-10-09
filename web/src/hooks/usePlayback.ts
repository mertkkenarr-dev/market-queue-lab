import { useEffect, type MutableRefObject } from 'react'

export interface PlaybackClock {
  /** Simülasyon saniyesi (saat başından). */
  t: number
  /** Gerçek saniye başına simülasyon saniyesi. */
  speed: number
  playing: boolean
  /** t bu değerde durur: son müşterinin hizmeti bittiği an. */
  end: number
  /** Her yeniden başlatmada artar; sahne ajan durumlarını sıfırlar. */
  epoch: number
}

export type ClockRef = MutableRefObject<PlaybackClock>

/**
 * Saati tek yerden ilerletir. Birden çok sahne (yan yana karşılaştırma) aynı saati okur;
 * her sahne kendi karesinde ilerletseydi zaman iki kat hızlanırdı.
 */
export function useClockDriver(clock: ClockRef): void {
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const c = clock.current
      if (c.playing && c.t < c.end) c.t = Math.min(c.end, c.t + dt * c.speed)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [clock])
}
