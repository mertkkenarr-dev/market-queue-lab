import type { ReactNode } from 'react'

/** Anlatımda geçen, veriden gelen ve dile göre biçimlenmiş sayılar. */
export interface StoryNumbers {
  gapSec: number
  gapReal: string
  gapSim: string
  lanesProxy: string
  lanesLogs: string
  walkMin: string
  walkMax: string
  slowdown: string
  flip: string
  occP25: string
  occP75: string
  occMed: string
  probWaitMed: string
  p90Med: string
  p90Over2: string
}

export interface HeroCopy {
  title: string
  lede: string
  key: (lanes: number, customers: number) => string
  toggleAria: string
  separate: string
  pooled: (textbook: boolean) => string
  perCustomer: string
  watch: string
  validate: string
}

export interface StoryCopy {
  hero: HeroCopy
  problem: { title: string; body: ReactNode }
  approach: { title: string; steps: ReactNode[]; reproducible: ReactNode }
  changeover: { title: string; body: (n: StoryNumbers) => ReactNode; aside: (n: StoryNumbers) => ReactNode }
  field: { title: string; body: (n: StoryNumbers) => ReactNode; fine: string }
  breakEven: { title: string; body: ReactNode }
  store: { title: string; body: (n: StoryNumbers) => ReactNode }
  limits: { title: string; intro: ReactNode; items: ReactNode[]; nextTitle: string; next: ReactNode[]; closing: ReactNode; links: { validation: string; method: string } }
}
