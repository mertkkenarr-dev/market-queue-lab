import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, TiltShift2 } from '@react-three/postprocessing'
import { PCFSoftShadowMap } from 'three'
import type { ClockRef } from '../hooks/usePlayback'
import { COLORS } from '../lib/palette'
import type { Journey, LayoutKind, ReplayStats } from '../types/scenario'
import { BeltItems } from './BeltItems'
import { Counters } from './Counters'
import { Crowd } from './Crowd'
import { Environment } from './Environment'
import { PooledGuides } from './PooledGuides'

interface Props {
  journeys: readonly Journey[]
  layout: LayoutKind
  lanes: number
  clock: ClockRef
  statsRef: { current: ReplayStats }
}

function ClockDriver({ clock }: { clock: ClockRef }) {
  useFrame((_, dt) => {
    const c = clock.current
    if (c.playing && c.t < c.end) c.t = Math.min(c.end, c.t + Math.min(dt, 0.1) * c.speed)
  })
  return null
}

export function StoreScene({ journeys, layout, lanes, clock, statsRef }: Props) {
  return (
    <Canvas shadows={{ type: PCFSoftShadowMap }} camera={{ position: [0, 11.5, 13], fov: 30 }} dpr={[1, 1.75]}>
      <color attach="background" args={[COLORS.wall]} />
      <hemisphereLight args={['#ffffff', '#9fb0a9', 1.1]} />
      <directionalLight
        position={[-6, 14, 9]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0004}
      />
      <OrbitControls target={[0, 0, 1.2]} enablePan={false} minDistance={8} maxDistance={32} minPolarAngle={0.25} maxPolarAngle={1.25} />
      <ClockDriver clock={clock} />
      <Environment />
      <Counters lanes={lanes} statsRef={statsRef} />
      <BeltItems journeys={journeys} lanes={lanes} clock={clock} />
      {layout === 'pooled' && <PooledGuides lanes={lanes} />}
      <Crowd journeys={journeys} layout={layout} lanes={lanes} clock={clock} statsRef={statsRef} />
      <EffectComposer multisampling={4}>
        <TiltShift2 blur={0.1} />
      </EffectComposer>
    </Canvas>
  )
}
