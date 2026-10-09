import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useRef } from 'react'
import { EffectComposer, TiltShift2 } from '@react-three/postprocessing'
import { PCFSoftShadowMap } from 'three'
import type { ClockRef } from '../hooks/usePlayback'
import { COLORS } from '../lib/palette'
import { SNAKE } from '../lib/serpentine'
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
  /** Yan yana karşılaştırmada iki sahne birlikte çizilir: çözünürlük ve gölge kalitesi düşürülür. */
  compact?: boolean
}

export function StoreScene({ journeys, layout, lanes, clock, statsRef, compact = false }: Props) {
  const snakeRows = useRef<number>(SNAKE.minRows)
  return (
    <Canvas shadows={{ type: PCFSoftShadowMap }} camera={{ position: compact ? [0, 18, 27] : [0, 15, 21], fov: 30 }} dpr={compact ? [1, 1.25] : [1, 1.75]}>
      <color attach="background" args={[COLORS.wall]} />
      <hemisphereLight args={['#ffffff', '#9fb0a9', 1.1]} />
      <directionalLight
        position={[-6, 18, 14]}
        intensity={2.2}
        castShadow
        shadow-mapSize={compact ? [2048, 2048] : [3072, 3072]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={18}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0004}
      />
      <OrbitControls target={[0, 0, 3.5]} enablePan={false} minDistance={8} maxDistance={40} minPolarAngle={0.25} maxPolarAngle={1.25} />
      <Environment />
      <Counters lanes={lanes} statsRef={statsRef} />
      <BeltItems journeys={journeys} lanes={lanes} clock={clock} />
      {layout === 'pooled' && <PooledGuides lanes={lanes} rowsRef={snakeRows} />}
      <Crowd journeys={journeys} layout={layout} lanes={lanes} clock={clock} statsRef={statsRef} snakeRows={snakeRows} />
      <EffectComposer multisampling={4}>
        <TiltShift2 blur={0.1} />
      </EffectComposer>
    </Canvas>
  )
}
