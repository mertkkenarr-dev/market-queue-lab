import type { ReactNode } from 'react'

export interface ValidationNumbers {
  gapMape: string | null
  gapCoverage: string | null
  gapCorr: string
  gapSec: number
  lanesProxy: string
  lanesLogs: string
  r2Mean: string
  r2P90: string
}

export interface ValidationCopy {
  title: string
  intro: string
  callout: string
  theory: { title: string; body: string }
  gaps: { title: string; body: (n: ValidationNumbers) => ReactNode; scatterTitle: (sec: number) => string; honest: (n: ValidationNumbers) => ReactNode; bug: (n: ValidationNumbers) => ReactNode }
  holdout: { title: string; body: string; after: string; scatters: { service: string; occupancy: string; count: string; basket: string }; fine: string }
  recal: { title: string; body: string; after: string }
  ml: { title: string; body: (n: ValidationNumbers) => ReactNode; arrival: string }
  limits: { title: string; items: string[] }
}
