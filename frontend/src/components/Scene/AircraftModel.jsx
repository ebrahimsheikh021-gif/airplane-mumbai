import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { latLonToLocal, altitudeToY, phaseColor, phaseLabel } from '../../utils/geo';
import { useStore } from '../../store';

function buildPlaneGeometry() {
  // Fuselage
  const fuselage = new THREE.CylinderGeometry(0.008, 0.005, 0.08, 8);
  fuselage.rotateX(Math.PI / 2);

  // Wings
  const wing = new THREE.BoxGeometry(0.1, 0.003, 0.018);

  // Tail horizontal stab
  const hStab = new THREE.BoxGeometry(0.04, 0.002, 0.012);
  const hStabGeo = hStab.clone();
  hStabGeo.translate(0, 0, -0.034);

  // Tail vertical fin
  const vFin = new THREE.BoxGeometry(0.003, 0.02, 0.015);
  const vFinGeo = vFin.clone();
  vFinGeo.translate(0, 0.01, -0.034);

  return { fuselage, wing, hStabGeo, vFinGeo };
}

export function AircraftModel({ aircraft, prevAircraft, interpProgress }) {
  const meshRef = useRef();
  const glowRef = useRef();
  const selectedHex = useStore((s) => s.selectedHex);
  const setSelected = useStore((s) => s.setSelected);
  const isSelected = selectedHex === aircraft.hex;

  const color = useMemo(() => phaseColor(aircraft.phase), [aircraft.phase]);
  const label = phaseLabel(aircraft.phase);

  const targetPos = useMemo(() => {
    const { x, z } = latLonToLocal(aircraft.lat, aircraft.lon);
    const y = altitudeToY(aircraft.altitude_ft);
    return { x, y, z };
  }, [aircraft]);

  const prevPos = useMemo(() => {
    if (!prevAircraft) return targetPos;
    const { x, z } = latLonToLocal(prevAircraft.lat, prevAircraft.lon);
    const y = altitudeToY(prevAircraft.altitude_ft);
    return { x, y, z };
  }, [prevAircraft, targetPos]);

  const headingRad = useMemo(() => {
    if (aircraft.heading == null) return 0;
    return (-aircraft.heading * Math.PI) / 180;
  }, [aircraft.heading]);

  useFrame(() => {
    if (!meshRef.current) return;
    const t = interpProgress;
    const px = prevPos.x + (targetPos.x - prevPos.x) * t;
    const py = prevPos.y + (targetPos.y - prevPos.y) * t;
    const pz = prevPos.z + (targetPos.z - prevPos.z) * t;
    meshRef.current.position.set(px, py, pz);
    meshRef.current.rotation.y = headingRad;
  });

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 3);
      glowRef.current.material.opacity = isSelected ? 0.6 + 0.4 * pulse : 0.18 + 0.12 * pulse;
    }
  });

  return (
    <group
      ref={meshRef}
      onClick={(e) => {
        e.stopPropagation();
        setSelected(isSelected ? null : aircraft.hex);
      }}
    >
      {/* Glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} />
      </mesh>

      {/* Aircraft body — fuselage */}
      <mesh>
        <cylinderGeometry args={[0.008, 0.005, 0.08, 8]} />
        <meshStandardMaterial
          color={isSelected ? '#ffffff' : color}
          emissive={color}
          emissiveIntensity={isSelected ? 1.5 : 0.8}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* Wings */}
      <mesh>
        <boxGeometry args={[0.1, 0.003, 0.018]} />
        <meshStandardMaterial
          color={isSelected ? '#ffffff' : color}
          emissive={color}
          emissiveIntensity={isSelected ? 1.2 : 0.5}
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>

      {/* Horizontal stabiliser */}
      <mesh position={[0, 0, -0.034]}>
        <boxGeometry args={[0.04, 0.002, 0.012]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>

      {/* Vertical fin */}
      <mesh position={[0, 0.01, -0.034]}>
        <boxGeometry args={[0.003, 0.02, 0.015]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>

      {/* Nose cone */}
      <mesh position={[0, 0, 0.045]}>
        <coneGeometry args={[0.006, 0.018, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>

      {/* Drop shadow / ground echo */}
      <mesh
        position={[0, -targetPos.y + 0.005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.06, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} />
      </mesh>

      {/* Vertical line to ground */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, 0, -targetPos.y, 0]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={0.25} />
      </line>

      {/* Billboard label */}
      <Billboard position={[0, 0.15, 0]}>
        <Text
          fontSize={0.035}
          color={isSelected ? '#ffffff' : color}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.004}
          outlineColor="#000000"
          font="https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxTOlOTk6OThhvA.woff2"
        >
          {aircraft.callsign}
        </Text>
        <Text
          position={[0, -0.04, 0]}
          fontSize={0.024}
          color={color}
          anchorX="center"
          anchorY="top"
          outlineWidth={0.003}
          outlineColor="#000000"
          font="https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxTOlOTk6OThhvA.woff2"
        >
          {label}
        </Text>
      </Billboard>
    </group>
  );
}
