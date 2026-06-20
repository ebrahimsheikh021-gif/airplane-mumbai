import React from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";

// The airport: a dark asphalt runway strip with centreline markings,
// threshold bars and a floating "BOM Runway" label, plus a beacon at the
// airport reference point (scene origin).
export default function Runway() {
  const stripeCount = 9;
  const runwayLength = 14;
  const runwayWidth = 1.4;

  return (
    <group>
      {/* Runway surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[runwayWidth, runwayLength]} />
        <meshStandardMaterial color="#11161f" roughness={0.95} metalness={0.05} />
      </mesh>

      {/* Centreline dashes */}
      {Array.from({ length: stripeCount }).map((_, i) => {
        const z = -runwayLength / 2 + 1.2 + (i * (runwayLength - 2.4)) / (stripeCount - 1);
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, z]}>
            <planeGeometry args={[0.08, 0.7]} />
            <meshBasicMaterial color="#dfe7f5" />
          </mesh>
        );
      })}

      {/* Threshold bars at both ends */}
      {[-1, 1].map((dir) => (
        <group key={dir}>
          {[-0.45, -0.27, -0.09, 0.09, 0.27, 0.45].map((x) => (
            <mesh
              key={x}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[x, 0.04, dir * (runwayLength / 2 - 0.6)]}
            >
              <planeGeometry args={[0.1, 0.8]} />
              <meshBasicMaterial color="#f4f8ff" />
            </mesh>
          ))}
        </group>
      ))}

      {/* Approach lighting trail extending from the south threshold */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={`app-${i}`}
          position={[0, 0.06, runwayLength / 2 + 0.8 + i * 0.9]}
        >
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshBasicMaterial color="#7ad7ff" />
        </mesh>
      ))}

      {/* Airport beacon at the reference point */}
      <mesh position={[runwayWidth / 2 + 0.6, 0.4, 0]}>
        <cylinderGeometry args={[0.06, 0.12, 0.8, 8]} />
        <meshStandardMaterial color="#1d2735" emissive="#2bd4ff" emissiveIntensity={0.6} />
      </mesh>
      <pointLight position={[runwayWidth / 2 + 0.6, 1, 0]} color="#2bd4ff" intensity={6} distance={8} />

      {/* Runway label */}
      <Html center distanceFactor={70} position={[runwayWidth / 2 + 2.4, 0.6, 0]}>
        <div className="runway-label">
          <span className="runway-label__icao">BOM Runway</span>
          <span className="runway-label__sub">VABB · 09 / 27</span>
        </div>
      </Html>
    </group>
  );
}
