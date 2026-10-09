export type DowGroup = 'mon_thu' | 'fri' | 'sat' | 'sun'
export type LayoutKind = 'pooled' | 'separate-jsq' | 'separate-random'

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
  /** Kasa başına: şu an hizmet var mı (1) yok mu (0). Kasiyer hareketi ve lamba bunu okur. */
  laneServing: Uint8Array
}
