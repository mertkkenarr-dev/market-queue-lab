import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, TiltShift2 } from '@react-three/postprocessing'
import type { ClockRef } from '../hooks/usePlayback'
import { COLORS } from '../lib/palette'
import type { Journey, LayoutKind, ReplayStats } from '../types/scenario'
import { Customers } from './Customers'
import { Floor } from './Floor'

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
    <Canvas camera={{ position: [0, 17, 14], fov: 26 }} dpr={[1, 1.5]} onCreated={({ camera }) => camera.lookAt(0, 0, 0.9)}>
      <color attach="background" args={[COLORS.wall]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[5, 10, 6]} intensity={1.4} />
      <ClockDriver clock={clock} />
      <Floor lanes={lanes} />
      <Customers journeys={journeys} layout={layout} lanes={lanes} clock={clock} statsRef={statsRef} />
      <EffectComposer multisampling={0}>
        <TiltShift2 blur={0.22} />
      </EffectComposer>
    </Canvas>
  )
}
