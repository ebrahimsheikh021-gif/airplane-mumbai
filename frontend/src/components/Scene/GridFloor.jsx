import { useMemo } from 'react';
import * as THREE from 'three';

export function GridFloor() {
  const gridSize = 22; // units — covers 220 km radius
  const divisions = 44;

  const ringGeometry = useMemo(() => {
    const rings = [];
    [2, 4, 6, 8, 10].forEach((r) => {
      const points = [];
      for (let i = 0; i <= 128; i++) {
        const angle = (i / 128) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r));
      }
      rings.push(points);
    });
    return rings;
  }, []);

  return (
    <group>
      {/* Main grid */}
      <gridHelper
        args={[gridSize * 2, divisions, '#0a2a4a', '#0a2a4a']}
        position={[0, 0, 0]}
      />

      {/* Radar range rings */}
      {ringGeometry.map((points, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(points.flatMap((p) => [p.x, p.y, p.z])), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#0d3a5e"
            transparent
            opacity={0.5}
          />
        </line>
      ))}

      {/* Ground plane (dark, semi-transparent) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[gridSize * 2 + 4, gridSize * 2 + 4]} />
        <meshStandardMaterial
          color="#020c18"
          transparent
          opacity={0.95}
          roughness={1}
        />
      </mesh>
    </group>
  );
}
