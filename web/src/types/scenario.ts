export type DowGroup = 'mon_thu' | 'fri' | 'sat' | 'sun'
export type LayoutKind = 'pooled' | 'separate-jsq' | 'separate-random'

/** Bir müşterinin motor izinden çıkarılmış yolculuğu; id sırası varış sırasıdır. */
export interface Journey {
  arrival: number
  /** Kasa bu müşteri için boşaldı; ortak kuyrukta buradan `start`'a kadar kasaya yürür. */
  called: number
  /** Kasaya vardı, bekleme bitti. */
  start: number
  /** Tarama bitti; sonrası ödeme kapanışı ve poşetleme (geçiş süresi). */
  scanEnd: number
  /** Kasa boşaldı, müşteri çıkıyor. */
  end: number
  lane: number
  items: number
}

/** Ortak kuyruğun bedelleri açık (saha) mı, kapalı (ders kitabı) mı. */
export type ModelKind = 'saha' | 'ders'

export interface ReplayStats {
  waiting: number
  serving: number
  done: number
  meanWaitStarted: number
  /** Kasa başına: şu an hizmet var mı (1) yok mu (0). Kasiyer hareketi ve lamba bunu okur. */
  laneServing: Uint8Array
}
