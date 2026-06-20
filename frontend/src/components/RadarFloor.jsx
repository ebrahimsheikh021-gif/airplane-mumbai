import React, { useMemo } from "react";
import { Grid, Html } from "@react-three/drei";
import * as THREE from "three";
import { KM_PER_UNIT } from "../geo.js";

// Concentric range ring (e.g. 25/50/75/100 km) drawn flat on the floor.
function RangeRing({ radiusUnits, label }) {
  const points = useMemo(() => {
    const segs = 128;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radiusUnits, 0.03, Math.sin(a) * radiusUnits));
    }
    return pts;
  }, [radiusUnits]);

  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  return (
    <group>
      <line geometry={geometry}>
        <lineBasicMaterial color="#1f4d6b" transparent opacity={0.55} />
      </line>
      <Html center distanceFactor={90} position={[0, 0.05, -radiusUnits]}>
        <div className="range-ring-label">{label}</div>
      </Html>
    </group>
  );
}

export default function RadarFloor() {
  const rings = [25, 50, 75, 100];

  return (
    <group>
      {/* Subtle radar glow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[110 / KM_PER_UNIT, 64]} />
        <meshBasicMaterial color="#08111c" transparent opacity={0.85} />
      </mesh>

      {/* Technical grid floor */}
      <Grid
        position={[0, 0, 0]}
        args={[240, 240]}
        cellSize={10 / KM_PER_UNIT}
        cellThickness={0.6}
        cellColor="#15324a"
        sectionSize={50 / KM_PER_UNIT}
        sectionThickness={1.1}
        sectionColor="#1f5d80"
        fadeDistance={220}
        fadeStrength={1.5}
        infiniteGrid
      />

      {rings.map((km) => (
        <RangeRing key={km} radiusUnits={km / KM_PER_UNIT} label={`${km} km`} />
      ))}

      {/* Cardinal direction markers */}
      {[
        { t: "N", x: 0, z: -105 / KM_PER_UNIT },
        { t: "S", x: 0, z: 105 / KM_PER_UNIT },
        { t: "E", x: 105 / KM_PER_UNIT, z: 0 },
        { t: "W", x: -105 / KM_PER_UNIT, z: 0 },
      ].map((c) => (
        <Html key={c.t} center distanceFactor={120} position={[c.x, 0.05, c.z]}>
          <div className="cardinal-label">{c.t}</div>
        </Html>
      ))}
    </group>
  );
}
