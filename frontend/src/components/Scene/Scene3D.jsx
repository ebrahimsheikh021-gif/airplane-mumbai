import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Suspense, useRef, useEffect } from 'react';
import { GridFloor } from './GridFloor';
import { Runway } from './Runway';
import { AircraftModel } from './AircraftModel';
import { AirportMarker } from './AirportMarker';
import { useStore } from '../../store';

const INTERP_DURATION_MS = 18000; // interpolate over ~18s so it arrives just before next refresh

function InterpolationDriver() {
  const setProgress = useStore((s) => s.setInterpolationProgress);
  const lastUpdateRef = useRef(Date.now());
  const lastUpdated = useStore((s) => s.lastUpdated);

  useEffect(() => {
    lastUpdateRef.current = Date.now();
  }, [lastUpdated]);

  useFrame(() => {
    const elapsed = Date.now() - lastUpdateRef.current;
    const progress = Math.min(1, elapsed / INTERP_DURATION_MS);
    setProgress(progress);
  });

  return null;
}

function SceneContent() {
  const arrivals = useStore((s) => s.arrivals);
  const previousArrivals = useStore((s) => s.previousArrivals);
  const interpProgress = useStore((s) => s.interpolationProgress);

  const prevMap = {};
  previousArrivals.forEach((a) => { prevMap[a.hex] = a; });

  return (
    <>
      <InterpolationDriver />
      <color attach="background" args={['#04080f']} />
      <ambientLight intensity={0.15} />
      <directionalLight position={[10, 20, 10]} intensity={0.5} color="#ffffff" />
      <pointLight position={[0, 5, 0]} intensity={0.3} color="#00c8ff" />
      <Stars radius={80} depth={50} count={3000} factor={3} fade speed={0.5} />

      <GridFloor />
      <Runway />
      <AirportMarker />

      {arrivals.map((ac) => (
        <AircraftModel
          key={ac.hex}
          aircraft={ac}
          prevAircraft={prevMap[ac.hex] || null}
          interpProgress={interpProgress}
        />
      ))}

      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        minDistance={0.5}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2 - 0.02}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.07}
      />
    </>
  );
}

export function Scene3D() {
  return (
    <Canvas
      camera={{ position: [0, 4, 8], fov: 55, near: 0.01, far: 500 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      shadows={false}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
    </Canvas>
  );
}
