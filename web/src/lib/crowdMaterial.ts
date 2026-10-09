import { MeshStandardMaterial } from 'three'
import { HIP_Y, SHOULDER_Y } from './humanoid'

/**
 * Yürüme ve kıyafet rengi GPU'da: örnek başına yalnızca hareket miktarı (aMove) her karede yazılır,
 * renkler ve faz bir kez. Böylece yüzlerce figür tek çizim çağrısıyla animasyonlu çizilir.
 */
export function createCrowdMaterial(): { material: MeshStandardMaterial; uTime: { value: number } } {
  const uTime = { value: 0 }
  const material = new MeshStandardMaterial({ roughness: 0.8, metalness: 0 })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec2 aPZ; attribute vec4 aAnim;
        attribute vec3 aShirt; attribute vec3 aPants; attribute vec3 aSkin; attribute vec3 aHair;
        uniform float uTime;
        varying float vZone; varying vec3 vShirt; varying vec3 vPants; varying vec3 vSkin; varying vec3 vHair;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float aPart = aPZ.x; vZone = aPZ.y; vShirt = aShirt; vPants = aPants; vSkin = aSkin; vHair = aHair;
        float aMove = aAnim.x; float aPhase = aAnim.y; float aArms = aAnim.z; float aWork = aAnim.w;
        float s = sin(uTime * 8.0 + aPhase) * aMove;
        float ang = 0.0; float pivot = ${HIP_Y.toFixed(2)};
        if (aPart > 0.5 && aPart < 1.5) { ang = -s * 0.62; }
        else if (aPart > 1.5 && aPart < 2.5) { ang = s * 0.62; }
        else if (aPart > 2.5) { pivot = ${SHOULDER_Y.toFixed(2)}; ang = aArms + (aPart < 3.5 ? s : -s) * 0.28 + sin(uTime * 6.0 + aPhase + (aPart < 3.5 ? 0.0 : 1.7)) * aWork * 0.22; }
        if (aPart > 0.5) {
          float dy = transformed.y - pivot;
          float nz = dy * sin(ang) + transformed.z * cos(ang);
          transformed.y = pivot + dy * cos(ang) - transformed.z * sin(ang);
          transformed.z = nz;
        }
        transformed.y += abs(s) * 0.025;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vZone; varying vec3 vShirt; varying vec3 vPants; varying vec3 vSkin; varying vec3 vHair;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 zc = vSkin;
        if (vZone > 0.5 && vZone < 1.5) zc = vShirt;
        else if (vZone > 1.5 && vZone < 2.5) zc = vPants;
        else if (vZone > 2.5 && vZone < 3.5) zc = vec3(0.04);
        else if (vZone > 3.5) zc = vHair;
        diffuseColor.rgb = zc;`,
      )
  }
  return { material, uTime }
}
