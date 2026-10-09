import type { Lang } from '../lib/format'
import { storyEn } from './story.en'
import { storyTr } from './story.tr'
import type { StoryCopy } from './story.types'

export const STORY: Record<Lang, StoryCopy> = { tr: storyTr, en: storyEn }
