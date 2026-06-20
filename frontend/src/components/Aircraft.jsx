import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { projectAircraft, phaseMeta, formatAltitude } from "../geo.js";

// A stylised commercial airliner built from primitive meshes (fuselage,
// wings, tail). Cheap to render for dozens of aircraft.
function PlaneModel({ color, selected }) {
  return (
    <group rotation={[0, 0, 0]} scale={selected ? 1.35 : 1}>
      {/* Fuselage */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 1.5, 12]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.35} />
      </mesh>
      {/* Nose cone */}
      <mesh position={[0, 0, 0.85]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.13, 0.4, 12]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.35} />
      </mesh>
      {/* Main wings */}
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[2.0, 0.04, 0.42]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} />
      </mesh>
      {/* Tailplane */}
      <mesh position={[0, 0, -0.65]}>
        <boxGeometry args={[0.8, 0.04, 0.26]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} />
      </mesh>
      {/* Vertical stabiliser */}
      <mesh position={[0, 0.22, -0.65]}>
        <boxGeometry args={[0.04, 0.4, 0.3]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} />
      </mesh>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <ringGeometry args={[1.3, 1.55, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

export default function Aircraft({ aircraft, selected, onSelect }) {
  const groupRef = useRef();
  const dropLineRef = useRef();
  const meta = phaseMeta(aircraft.phase);

  // Target transform derived from live data.
  const target = useMemo(() => {
    const [x, y, z] = projectAircraft(aircraft.lat, aircraft.lon, aircraft.altitude);
    // Heading is degrees clockwise from north. In our scene north is -Z.
    const headingRad = THREE.MathUtils.degToRad(aircraft.heading ?? 0);
    return { pos: new THREE.Vector3(x, y, z), yaw: -headingRad };
  }, [aircraft.lat, aircraft.lon, aircraft.altitude, aircraft.heading]);

  // Smoothly interpolate toward the latest position/heading every frame.
  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const lerp = Math.min(1, delta * 2.5);
    g.position.lerp(target.pos, lerp);

    // Shortest-path angular interpolation for yaw.
    let current = g.rotation.y;
    let diff = target.yaw - current;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    g.rotation.y = current + diff * lerp;

    // Keep the altitude drop-line glued under the aircraft.
    if (dropLineRef.current) {
      dropLineRef.current.position.set(g.position.x, g.position.y / 2, g.position.z);
      dropLineRef.current.scale.y = Math.max(0.001, g.position.y);
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    onSelect(aircraft.hex);
  };

  const label = aircraft.callsign || aircraft.registration || aircraft.hex;

  return (
    <group>
      <group ref={groupRef} onClick={handleClick}>
        <PlaneModel color={meta.color} selected={selected} />
        <Html
          center
          distanceFactor={60}
          position={[0, 1.1, 0]}
          zIndexRange={[10, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className={`plane-label ${selected ? "plane-label--selected" : ""}`}>
            <span className="plane-label__call" style={{ color: meta.color }}>
              {label}
            </span>
            <span className="plane-label__alt">{formatAltitude(aircraft.altitude)}</span>
          </div>
        </Html>
      </group>

      {/* Vertical line from aircraft to the ground (altitude cue). */}
      <mesh ref={dropLineRef}>
        <cylinderGeometry args={[0.015, 0.015, 1, 6]} />
        <meshBasicMaterial color={meta.color} transparent opacity={0.28} />
      </mesh>
    </group>
  );
}
