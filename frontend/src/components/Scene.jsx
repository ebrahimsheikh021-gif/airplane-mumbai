import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import RadarFloor from "./RadarFloor.jsx";
import Runway from "./Runway.jsx";
import Aircraft from "./Aircraft.jsx";

export default function Scene({ arrivals, selectedHex, onSelect }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [40, 48, 70], fov: 42, near: 0.1, far: 2000 }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={["#05080f"]} />
      <fog attach="fog" args={["#05080f", 120, 360]} />

      <ambientLight intensity={0.45} />
      <directionalLight position={[60, 90, 40]} intensity={1.1} castShadow />
      <directionalLight position={[-50, 40, -30]} intensity={0.35} color="#2bd4ff" />

      <Stars radius={400} depth={80} count={2500} factor={5} saturation={0} fade speed={0.5} />

      <RadarFloor />
      <Runway />

      {arrivals.map((ac) => (
        <Aircraft
          key={ac.hex}
          aircraft={ac}
          selected={ac.hex === selectedHex}
          onSelect={onSelect}
        />
      ))}

      <OrbitControls
        enablePan
        enableDamping
        dampingFactor={0.08}
        minDistance={18}
        maxDistance={220}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 4, 0]}
      />
    </Canvas>
  );
}
