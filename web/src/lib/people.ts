import { Color } from 'three'
import { mulberry32 } from './prng'

const SHIRTS = ['#c8553d', '#2f6f8f', '#e0b84c', '#5a7d5a', '#d8d2c4', '#7b5ea7', '#2b3a55', '#b5486a', '#8a9a3d', '#e08f4a', '#4a4a4a', '#a8c4cc']
const PANTS = ['#2b3040', '#3c3a36', '#4b5563', '#5a4a3a', '#1f2430', '#6b7280']
const SKINS = ['#f2d0b5', '#e3b48f', '#c98f66', '#9b6a47', '#6e4730', '#f5dcc8']
const HAIRS = ['#1c1a18', '#3b2a1e', '#6b4a2b', '#a37b45', '#8a8a86', '#d9d3c4']

export interface PersonStyle {
  shirt: Color
  pants: Color
  skin: Color
  hair: Color
  phase: number
}

const pick = <T,>(list: readonly T[], r: number): T => list[Math.floor(r * list.length)] as T

/** Aynı id her zaman aynı kişiyi üretir: yeniden oynatmada kalabalık değişmez. */
export function personStyle(id: number): PersonStyle {
  const rand = mulberry32(id * 2654435761 + 17)
  return {
    shirt: new Color(pick(SHIRTS, rand())),
    pants: new Color(pick(PANTS, rand())),
    skin: new Color(pick(SKINS, rand())),
    hair: new Color(pick(HAIRS, rand())),
    phase: rand() * Math.PI * 2,
  }
}

export const STAFF_STYLE = (i: number): PersonStyle => ({
  shirt: new Color('#2f6f4f'),
  pants: new Color('#2b3040'),
  skin: personStyle(1000 + i).skin,
  hair: personStyle(1000 + i).hair,
  phase: i,
})
