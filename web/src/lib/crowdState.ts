import { InstancedBufferAttribute, type BufferGeometry } from 'three'
import { personStyle, type PersonStyle } from './people'

export interface AgentState {
  x: Float32Array
  z: Float32Array
  yaw: Float32Array
  move: Float32Array
  /** 0 henüz görünmedi, 1 mağazada, 2 çıkışa yürüyor, 3 bitti (bu oynatmada bir daha çizilmez). */
  phase: Uint8Array
}

export function makeAgentState(n: number): AgentState {
  return { x: new Float32Array(n), z: new Float32Array(n), yaw: new Float32Array(n), move: new Float32Array(n), phase: new Uint8Array(n) }
}

const vec3 = (arr: Float32Array, i: number, c: { r: number; g: number; b: number }) => {
  arr[i * 3] = c.r
  arr[i * 3 + 1] = c.g
  arr[i * 3 + 2] = c.b
}

export interface CrowdAttributes {
  move: InstancedBufferAttribute
  work: InstancedBufferAttribute
}

/** Örnek başına nitelikleri ekler: stil ve faz bir kez, hareket miktarı (aMove) her karede güncellenir. */
export function attachInstanceAttributes(geo: BufferGeometry, styles: readonly PersonStyle[], armsAngle: number): CrowdAttributes {
  const n = styles.length
  const shirt = new Float32Array(n * 3)
  const pants = new Float32Array(n * 3)
  const skin = new Float32Array(n * 3)
  const hair = new Float32Array(n * 3)
  const anim = new Float32Array(n * 4)
  styles.forEach((s, i) => {
    vec3(shirt, i, s.shirt)
    vec3(pants, i, s.pants)
    vec3(skin, i, s.skin)
    vec3(hair, i, s.hair)
    anim[i * 4 + 1] = s.phase
    anim[i * 4 + 2] = armsAngle
  })
  const animAttr = new InstancedBufferAttribute(anim, 4)
  geo.setAttribute('aShirt', new InstancedBufferAttribute(shirt, 3))
  geo.setAttribute('aPants', new InstancedBufferAttribute(pants, 3))
  geo.setAttribute('aSkin', new InstancedBufferAttribute(skin, 3))
  geo.setAttribute('aHair', new InstancedBufferAttribute(hair, 3))
  geo.setAttribute('aAnim', animAttr)
  return { move: animAttr, work: animAttr }
}

export const stylesFor = (n: number): PersonStyle[] => Array.from({ length: n }, (_, i) => personStyle(i))
