import type { Serpentine } from './serpentine'

/** Ajan hareketi: gerçek yürüme hızı, sıra ilerlerken arkaya doğru gecikme dalgası, birbirini itme. Saf ve testli. */

export const MAX_SPEED = 3.4
export const SEPARATION_RADIUS = 0.6
export const NO_PENDING = -1

export interface AgentState {
  x: Float32Array
  z: Float32Array
  yaw: Float32Array
  move: Float32Array
  goalX: Float32Array
  goalZ: Float32Array
  /** Hedef değişimini uygulamak için kalan gecikme (sn); NO_PENDING = bekleyen değişim yok. */
  pending: Float32Array
  /** Kıvrımlı yolda ilerlerken sıranın başına olan uzaklık (m); yalnızca mode=1 iken anlamlı. */
  pathS: Float32Array
  /** 0 serbest yürüyüş, 1 kıvrımlı yolda (konum yoldan türetilir). */
  mode: Uint8Array
  /** 0 henüz görünmedi, 1 mağazada, 2 çıkışa yürüyor, 3 bitti (bu oynatmada bir daha çizilmez). */
  phase: Uint8Array
}

export function makeAgentState(n: number): AgentState {
  const f = () => new Float32Array(n)
  return { x: f(), z: f(), yaw: f(), move: f(), goalX: f(), goalZ: f(), pathS: f(), mode: new Uint8Array(n), pending: new Float32Array(n).fill(NO_PENDING), phase: new Uint8Array(n) }
}

export function resetAgents(a: AgentState): void {
  a.phase.fill(0)
  a.mode.fill(0)
  a.move.fill(0)
  a.pending.fill(NO_PENDING)
}

/**
 * Hedef değişince hemen gitme: önce `delay` saniye bekle. Sıradaki kişi önce, arkadakiler
 * sırasıyla gecikmeli kalkar; böylece sıra tırtıl gibi ilerler, herkes aynı anda fırlamaz.
 */
export function retarget(a: AgentState, i: number, dt: number, dx: number, dz: number, delay: number): void {
  const moved = Math.hypot(dx - (a.goalX[i] as number), dz - (a.goalZ[i] as number)) > 0.05
  if (!moved) {
    a.pending[i] = NO_PENDING
    return
  }
  if ((a.pending[i] as number) === NO_PENDING) a.pending[i] = delay
  a.pending[i] = (a.pending[i] as number) - dt
  if ((a.pending[i] as number) <= 0) {
    a.goalX[i] = dx
    a.goalZ[i] = dz
    a.pending[i] = NO_PENDING
  }
}

const wrapPi = (v: number): number => ((((v + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI

/** Hedefe doğru yürür; yürüyorsa true. Dururken kasaya (−z) döner. */
export function walk(a: AgentState, i: number, dt: number): boolean {
  const dx = (a.goalX[i] as number) - (a.x[i] as number)
  const dz = (a.goalZ[i] as number) - (a.z[i] as number)
  const d = Math.hypot(dx, dz)
  const walking = d > 0.06
  if (walking) {
    const step = Math.min(d, Math.min(MAX_SPEED, 0.6 + d * 2.2) * dt)
    a.x[i] = (a.x[i] as number) + (dx / d) * step
    a.z[i] = (a.z[i] as number) + (dz / d) * step
  }
  a.move[i] = (a.move[i] as number) + ((walking ? 1 : 0) - (a.move[i] as number)) * (1 - Math.exp(-dt * 9))
  const wantYaw = walking && d > 0.25 ? Math.atan2(dx, dz) : Math.PI
  a.yaw[i] = (a.yaw[i] as number) + wrapPi(wantYaw - (a.yaw[i] as number)) * (1 - Math.exp(-dt * 8))
  return walking
}

/** Yakın ajanları birbirinden uzaklaştırır; sıra aralığı (≥0,95 m) yarıçaptan büyük olduğundan düzgün sırayı bozmaz. */
export function separate(a: AgentState, visible: Int32Array, count: number, dt: number): void {
  const k = Math.min(1, dt * 6)
  for (let p = 0; p < count; p++) {
    const i = visible[p] as number
    for (let q = p + 1; q < count; q++) {
      const j = visible[q] as number
      const dx = (a.x[i] as number) - (a.x[j] as number)
      const dz = (a.z[i] as number) - (a.z[j] as number)
      const d2 = dx * dx + dz * dz
      if (d2 >= SEPARATION_RADIUS * SEPARATION_RADIUS) continue
      const d = Math.sqrt(d2) || 0.001
      const push = ((SEPARATION_RADIUS - d) / 2) * k
      const ux = d2 === 0 ? 1 : dx / d
      const uz = d2 === 0 ? 0 : dz / d
      a.x[i] = (a.x[i] as number) + ux * push
      a.z[i] = (a.z[i] as number) + uz * push
      a.x[j] = (a.x[j] as number) - ux * push
      a.z[j] = (a.z[j] as number) - uz * push
    }
  }
}

const SNAKE_EASE = 2.2

/**
 * Kıvrımlı yolda hedefe (`sGoal`, sıranın başına uzaklık) doğru ilerler; konum ve bakış yoldan gelir.
 * Yürüyorsa true döner. Hız sınırı serbest yürüyüşle aynıdır.
 */
export function followPath(a: AgentState, i: number, dt: number, snake: Serpentine, sGoal: number): boolean {
  const d = sGoal - (a.pathS[i] as number)
  const walking = Math.abs(d) > 0.04
  if (walking) {
    const step = Math.min(Math.abs(d), Math.min(MAX_SPEED, 0.6 + Math.abs(d) * SNAKE_EASE) * dt)
    a.pathS[i] = (a.pathS[i] as number) + Math.sign(d) * step
  }
  const at = snake.at(a.pathS[i] as number)
  a.x[i] = at.x
  a.z[i] = at.z
  a.move[i] = (a.move[i] as number) + ((walking ? 1 : 0) - (a.move[i] as number)) * (1 - Math.exp(-dt * 9))
  a.yaw[i] = (a.yaw[i] as number) + wrapPi(at.yaw - (a.yaw[i] as number)) * (1 - Math.exp(-dt * 8))
  return walking
}

/** Kasa tezgâhlarının ön çizgisi: bunun gerisi bant ve kasiyer bölgesidir, yalnızca kendi koridorundan girilir. */
export const COUNTER_FRONT_Z = -0.6
const APPROACH_Z = COUNTER_FRONT_Z + 0.3

/**
 * Tezgâh bölgesine girerken önce kendi koridorunun hizasına gelir, çıkarken önce koridordan çıkar:
 * böylece bantların ve kasiyer tezgâhlarının içinden diyagonal geçmez.
 */
export function corridorRoute(x: number, z: number, tx: number, tz: number): { x: number; z: number } {
  if (z < COUNTER_FRONT_Z && tz >= COUNTER_FRONT_Z && Math.abs(x - tx) > 0.2) return { x, z: APPROACH_Z }
  if (z >= COUNTER_FRONT_Z && tz < COUNTER_FRONT_Z && Math.abs(x - tx) > 0.2) return { x: tx, z: APPROACH_Z }
  return { x: tx, z: tz }
}
