import { Text } from '@react-three/drei';

// BOM main runway orientation: roughly 09/27 (east-west), length ~3.4 km
// We represent it in scene units: 3.4 km * 0.1 = 0.34 units
const RUNWAY_LENGTH = 0.34;
const RUNWAY_WIDTH = 0.04;
const RUNWAY_HEADING_DEG = 90; // east-west

export function Runway() {
  const rotation = [0, (-RUNWAY_HEADING_DEG * Math.PI) / 180, 0];

  return (
    <group rotation={rotation} position={[0, 0.005, 0]}>
      {/* Runway surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[RUNWAY_WIDTH, RUNWAY_LENGTH]} />
        <meshStandardMaterial color="#1a2a1a" roughness={0.8} />
      </mesh>

      {/* Centre-line dashes */}
      {Array.from({ length: 10 }, (_, i) => {
        const z = -RUNWAY_LENGTH / 2 + (i + 0.5) * (RUNWAY_LENGTH / 10);
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, z]}>
            <planeGeometry args={[0.003, RUNWAY_LENGTH / 14]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
          </mesh>
        );
      })}

      {/* Threshold markings */}
      {[-1, 1].map((side) => (
        <mesh key={side} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, side * (RUNWAY_LENGTH / 2 - 0.01)]}>
          <planeGeometry args={[RUNWAY_WIDTH * 0.9, 0.008]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.4} />
        </mesh>
      ))}

      {/* Runway edge lights */}
      {Array.from({ length: 16 }, (_, i) => {
        const z = -RUNWAY_LENGTH / 2 + i * (RUNWAY_LENGTH / 15);
        return [
          <mesh key={`l${i}`} position={[-RUNWAY_WIDTH / 2, 0.005, z]}>
            <sphereGeometry args={[0.003, 6, 6]} />
            <meshStandardMaterial color="#00aaff" emissive="#00aaff" emissiveIntensity={2} />
          </mesh>,
          <mesh key={`r${i}`} position={[RUNWAY_WIDTH / 2, 0.005, z]}>
            <sphereGeometry args={[0.003, 6, 6]} />
            <meshStandardMaterial color="#00aaff" emissive="#00aaff" emissiveIntensity={2} />
          </mesh>,
        ];
      })}

      {/* Label */}
      <Text
        position={[0, 0.05, RUNWAY_LENGTH / 2 + 0.05]}
        fontSize={0.04}
        color="#00c8ff"
        anchorX="center"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2"
      >
        BOM RUNWAY 27
      </Text>
      <Text
        position={[0, 0.05, -RUNWAY_LENGTH / 2 - 0.05]}
        fontSize={0.04}
        color="#00c8ff"
        anchorX="center"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2"
      >
        BOM RUNWAY 09
      </Text>
    </group>
  );
}
