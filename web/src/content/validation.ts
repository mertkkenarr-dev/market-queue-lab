import type { Lang } from '../lib/format'
import { validationEn } from './validation.en'
import { validationTr } from './validation.tr'
import type { ValidationCopy } from './validation.types'

export const VALIDATION: Record<Lang, ValidationCopy> = { tr: validationTr, en: validationEn }
