import type { LayoutKind } from '../types/scenario'

export const LAYOUTS: readonly LayoutKind[] = ['separate-jsq', 'separate-random', 'pooled']

export const LAYOUT_NAME: Record<LayoutKind, string> = {
  'separate-jsq': 'Ayrı kuyruk, en kısayı seçer',
  'separate-random': 'Ayrı kuyruk, rastgele seçer',
  pooled: 'Tek ortak kuyruk',
}

export const LAYOUT_SHORT: Record<LayoutKind, string> = {
  'separate-jsq': 'ayrı (en kısa)',
  'separate-random': 'ayrı (rastgele)',
  pooled: 'ortak',
}
