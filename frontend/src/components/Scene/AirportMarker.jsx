import { Text } from '@react-three/drei';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export function AirportMarker() {
  const ringRef = useRef();

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const s = 1 + 0.08 * Math.sin(clock.getElapsedTime() * 1.5);
      ringRef.current.scale.setScalar(s);
    }
  });

  return (
    <group position={[0, 0.01, 0]}>
      {/* Pulsing outer ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.09, 0.11, 32]} />
        <meshBasicMaterial color="#00c8ff" transparent opacity={0.35} side={2} depthWrite={false} />
      </mesh>

      {/* Inner dot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.05, 32]} />
        <meshBasicMaterial color="#00c8ff" transparent opacity={0.5} depthWrite={false} />
      </mesh>

      {/* Cross marker */}
      {[0, Math.PI / 2].map((rot, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, rot]} position={[0, 0.001, 0]}>
          <planeGeometry args={[0.18, 0.006]} />
          <meshBasicMaterial color="#00c8ff" transparent opacity={0.6} />
        </mesh>
      ))}

      {/* BOM Label */}
      <Text
        position={[0, 0.08, 0.15]}
        fontSize={0.055}
        color="#00c8ff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.005}
        outlineColor="#000000"
        font="https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2"
      >
        BOM
      </Text>
    </group>
  );
}
