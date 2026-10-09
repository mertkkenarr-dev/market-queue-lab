import type { MutableRefObject } from 'react'

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
