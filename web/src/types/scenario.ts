export type DowGroup = 'mon_thu' | 'fri' | 'sat' | 'sun'
export type LayoutKind = 'pooled' | 'separate-jsq'

/** Bir müşterinin motor izinden çıkarılmış yolculuğu; id sırası varış sırasıdır. */
export interface Journey {
  arrival: number
  start: number
  end: number
  lane: number
  items: number
}

export interface ReplayStats {
  waiting: number
  serving: number
  done: number
  meanWaitStarted: number
}
