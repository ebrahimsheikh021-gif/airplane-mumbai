import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Grid, Html, OrbitControls, Stars, Text } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const BOM_LAT = 19.0896;
const BOM_LON = 72.8656;
const KM_PER_DEGREE_LAT = 110.574;
const KM_PER_DEGREE_LON = 111.32 * Math.cos((BOM_LAT * Math.PI) / 180);
const SCENE_KM_SCALE = 0.72;
const ALTITUDE_SCALE = 0.00072;
const POLL_INTERVAL_MS = 20_000;

type ArrivalPhase = "short_final" | "final_approach" | "approach" | "early_arrival";

type Arrival = {
  callsign: string;
  registration: string | null;
  aircraft_type: string | null;
  lat: number;
  lon: number;
  altitude: number;
  speed: number | null;
  heading: number | null;
  distance_from_bom: number;
  seen_time: number | null;
  phase: ArrivalPhase;
};

type ArrivalsResponse = {
  airport: string;
  source: string;
  cached: boolean;
  last_updated: string;
  arrivals: Arrival[];
};

type ScenePosition = [number, number, number];

const phaseLabels: Record<ArrivalPhase, string> = {
  short_final: "Short final",
  final_approach: "Final approach",
  approach: "Approach",
  early_arrival: "Early arrival",
};

const phaseColors: Record<ArrivalPhase, string> = {
  short_final: "#7cf6ff",
  final_approach: "#51ffa6",
  approach: "#ffd166",
  early_arrival: "#ff8f70",
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Waiting for data";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function toScenePosition(arrival: Arrival): ScenePosition {
  const eastKm = (arrival.lon - BOM_LON) * KM_PER_DEGREE_LON;
  const northKm = (arrival.lat - BOM_LAT) * KM_PER_DEGREE_LAT;
  const x = eastKm * SCENE_KM_SCALE;
  const z = -northKm * SCENE_KM_SCALE;
  const y = Math.max(0.45, arrival.altitude * ALTITUDE_SCALE);

  return [x, y, z];
}

function useArrivals() {
  const [data, setData] = useState<ArrivalsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchArrivals = useCallback(async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
      const response = await fetch(`${apiBase}/api/arrivals`, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Backend returned HTTP ${response.status}`);
      }

      const payload = (await response.json()) as ArrivalsResponse;
      setData(payload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load live arrivals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArrivals();
    const intervalId = window.setInterval(fetchArrivals, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [fetchArrivals]);

  return { data, error, loading, refresh: fetchArrivals };
}

function lerpAngle(current: number, target: number, factor: number) {
  const delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  return current + delta * factor;
}

function AircraftModel({
  arrival,
  selected,
  onSelect,
}: {
  arrival: Arrival;
  selected: boolean;
  onSelect: (callsign: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const targetPosition = useMemo(() => new THREE.Vector3(...toScenePosition(arrival)), [arrival]);
  const targetHeading = useMemo(() => {
    const heading = arrival.heading ?? 0;
    return THREE.MathUtils.degToRad(-heading);
  }, [arrival.heading]);

  useEffect(() => {
    if (!groupRef.current) {
      return;
    }

    if (groupRef.current.position.length() === 0) {
      groupRef.current.position.copy(targetPosition);
      groupRef.current.rotation.y = targetHeading;
    }
  }, [targetHeading, targetPosition]);

  useFrame(() => {
    if (!groupRef.current) {
      return;
    }

    groupRef.current.position.lerp(targetPosition, 0.045);
    groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, targetHeading, 0.055);
  });

  const color = selected ? "#ffffff" : phaseColors[arrival.phase];
  const labelOffset = Math.max(1.8, arrival.altitude * ALTITUDE_SCALE * 0.32);

  return (
    <group ref={groupRef} onClick={(event) => {
      event.stopPropagation();
      onSelect(arrival.callsign);
    }}>
      <Float speed={1.6} rotationIntensity={0.12} floatIntensity={0.16}>
        <group scale={selected ? 1.2 : 1}>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.34]}>
            <coneGeometry args={[0.32, 1.35, 4]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={selected ? 1.15 : 0.55}
              metalness={0.35}
              roughness={0.24}
            />
          </mesh>
          <mesh position={[0, 0, 0.06]}>
            <boxGeometry args={[1.42, 0.06, 0.18]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={selected ? 0.9 : 0.45}
              transparent
              opacity={0.86}
            />
          </mesh>
          <mesh position={[0, 0, 0.54]}>
            <boxGeometry args={[0.5, 0.05, 0.12]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
          </mesh>
        </group>
      </Float>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, -arrival.altitude * ALTITUDE_SCALE + 0.08, 0, 0, -0.2, 0]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={phaseColors[arrival.phase]} transparent opacity={0.28} />
      </line>
      <Html position={[0, labelOffset, 0]} center distanceFactor={14}>
        <button
          className={`aircraft-label ${selected ? "selected" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(arrival.callsign);
          }}
        >
          <strong>{arrival.callsign}</strong>
          <span>{Math.round(arrival.altitude).toLocaleString()} ft</span>
        </button>
      </Html>
    </group>
  );
}

function Runway() {
  return (
    <group rotation={[0, -0.12, 0]}>
      <mesh position={[0, 0.025, 0]}>
        <boxGeometry args={[5.6, 0.06, 24]} />
        <meshStandardMaterial color="#0b1119" metalness={0.2} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.064, 0]}>
        <boxGeometry args={[0.12, 0.02, 22]} />
        <meshStandardMaterial color="#e8fbff" emissive="#77e7ff" emissiveIntensity={0.55} />
      </mesh>
      {[-8, -4, 4, 8].map((z) => (
        <mesh key={z} position={[0, 0.08, z]}>
          <boxGeometry args={[0.22, 0.02, 1.6]} />
          <meshStandardMaterial color="#e8fbff" emissive="#b5f5ff" emissiveIntensity={0.4} />
        </mesh>
      ))}
      <Text
        position={[0, 0.22, -13.6]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1}
        color="#90f7ff"
        anchorX="center"
        anchorY="middle"
      >
        BOM Runway
      </Text>
    </group>
  );
}

function RadarRings() {
  return (
    <group>
      {[10, 25, 50, 75].map((km) => (
        <mesh key={km} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <ringGeometry args={[km * SCENE_KM_SCALE - 0.04, km * SCENE_KM_SCALE + 0.04, 160]} />
          <meshBasicMaterial color="#1dc7d6" transparent opacity={km === 75 ? 0.2 : 0.14} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, 0]}>
        <circleGeometry args={[1.1, 48]} />
        <meshBasicMaterial color="#8ff9ff" transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

function Scene({
  arrivals,
  selectedCallsign,
  onSelect,
}: {
  arrivals: Arrival[];
  selectedCallsign: string | null;
  onSelect: (callsign: string) => void;
}) {
  return (
    <Canvas camera={{ position: [0, 48, 70], fov: 47 }} dpr={[1, 2]} shadows>
      <color attach="background" args={["#030812"]} />
      <fog attach="fog" args={["#06121f", 64, 165]} />
      <ambientLight intensity={0.36} />
      <directionalLight position={[28, 42, 18]} intensity={1.15} color="#d5fbff" />
      <pointLight position={[0, 8, 0]} intensity={2} color="#3affff" distance={32} />
      <Suspense fallback={null}>
        <Stars radius={110} depth={36} count={1400} factor={4} saturation={0} fade speed={0.5} />
        <Grid
          position={[0, -0.02, 0]}
          args={[120, 120]}
          cellSize={3}
          cellThickness={0.45}
          cellColor="#164052"
          sectionSize={15}
          sectionThickness={1.15}
          sectionColor="#1ee4ff"
          fadeDistance={105}
          fadeStrength={1.8}
          infiniteGrid
        />
        <RadarRings />
        <Runway />
        {arrivals.map((arrival) => (
          <AircraftModel
            key={arrival.callsign}
            arrival={arrival}
            selected={arrival.callsign === selectedCallsign}
            onSelect={onSelect}
          />
        ))}
      </Suspense>
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2.12}
        minDistance={32}
        maxDistance={125}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FlightCard({
  arrival,
  selected,
  onSelect,
}: {
  arrival: Arrival;
  selected: boolean;
  onSelect: (callsign: string) => void;
}) {
  return (
    <button className={`flight-card ${selected ? "selected" : ""}`} onClick={() => onSelect(arrival.callsign)}>
      <div className="flight-card__topline">
        <strong>{arrival.callsign}</strong>
        <span style={{ color: phaseColors[arrival.phase] }}>{phaseLabels[arrival.phase]}</span>
      </div>
      <div className="flight-card__meta">
        <span>{arrival.distance_from_bom.toFixed(1)} km</span>
        <span>{arrival.altitude.toLocaleString()} ft</span>
        <span>{arrival.speed ? `${Math.round(arrival.speed)} kt` : "Speed n/a"}</span>
      </div>
      <div className="flight-card__subline">
        {arrival.aircraft_type ?? "Type n/a"} {arrival.registration ? `- ${arrival.registration}` : ""}
      </div>
    </button>
  );
}

function SelectedAircraft({ aircraft }: { aircraft: Arrival | null }) {
  if (!aircraft) {
    return (
      <div className="selected-empty">
        Select a plane or flight card to inspect live arrival details.
      </div>
    );
  }

  return (
    <div className="selected-aircraft">
      <div className="selected-aircraft__heading">
        <span>Selected aircraft</span>
        <strong>{aircraft.callsign}</strong>
      </div>
      <dl>
        <div>
          <dt>Phase</dt>
          <dd style={{ color: phaseColors[aircraft.phase] }}>{phaseLabels[aircraft.phase]}</dd>
        </div>
        <div>
          <dt>Distance</dt>
          <dd>{aircraft.distance_from_bom.toFixed(1)} km</dd>
        </div>
        <div>
          <dt>Altitude</dt>
          <dd>{aircraft.altitude.toLocaleString()} ft</dd>
        </div>
        <div>
          <dt>Speed</dt>
          <dd>{aircraft.speed ? `${Math.round(aircraft.speed)} kt` : "n/a"}</dd>
        </div>
        <div>
          <dt>Heading</dt>
          <dd>{aircraft.heading ? `${Math.round(aircraft.heading)} deg` : "n/a"}</dd>
        </div>
        <div>
          <dt>Registration</dt>
          <dd>{aircraft.registration ?? "n/a"}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function App() {
  const { data, error, loading, refresh } = useArrivals();
  const arrivals = data?.arrivals ?? [];
  const [selectedCallsign, setSelectedCallsign] = useState<string | null>(null);

  useEffect(() => {
    if (arrivals.length === 0) {
      setSelectedCallsign(null);
      return;
    }

    if (!selectedCallsign || !arrivals.some((arrival) => arrival.callsign === selectedCallsign)) {
      setSelectedCallsign(arrivals[0].callsign);
    }
  }, [arrivals, selectedCallsign]);

  const selectedAircraft = arrivals.find((arrival) => arrival.callsign === selectedCallsign) ?? null;

  return (
    <main className="app-shell">
      <div className="scene-layer">
        <Scene arrivals={arrivals} selectedCallsign={selectedCallsign} onSelect={setSelectedCallsign} />
      </div>

      <section className="top-panel glass-panel">
        <div className="brand-row">
          <div className="brand-mark">BOM</div>
          <div>
            <p className="eyebrow">Mumbai Airport / VABB</p>
            <h1>BOM Live Arrivals 3D</h1>
          </div>
        </div>
        <div className="stats-grid">
          <StatPill label="Live arrivals" value={loading ? "..." : arrivals.length} />
          <StatPill label="Last update" value={formatTimestamp(data?.last_updated ?? null)} />
          <StatPill label="Refresh" value="20 sec" />
          <StatPill label="Source" value={data?.cached ? "Cached" : "Live API"} />
        </div>
        <SelectedAircraft aircraft={selectedAircraft} />
        {error ? (
          <div className="status-message error">
            <strong>Live feed unavailable.</strong>
            <span>{error}</span>
            <button onClick={refresh}>Retry</button>
          </div>
        ) : null}
      </section>

      <aside className="flight-list glass-panel">
        <div className="flight-list__header">
          <div>
            <p className="eyebrow">Filtered commercial arrivals</p>
            <h2>Approach sequence</h2>
          </div>
          <span className="pulse-dot" aria-label="live feed active" />
        </div>
        {loading ? (
          <div className="status-message">Loading live aircraft around BOM...</div>
        ) : arrivals.length === 0 ? (
          <div className="status-message">
            <strong>No live arrivals currently detected</strong>
            <span>The real-time feed has no matching airborne commercial arrivals under 20,000 ft within 100 km.</span>
          </div>
        ) : (
          <div className="flight-card-stack">
            {arrivals.map((arrival) => (
              <FlightCard
                key={arrival.callsign}
                arrival={arrival}
                selected={arrival.callsign === selectedCallsign}
                onSelect={setSelectedCallsign}
              />
            ))}
          </div>
        )}
      </aside>

      <footer className="scene-footer">
        <span>Airplanes.live API via FastAPI backend</span>
        <span>100 km BOM radius - airborne only - no OpenSky</span>
      </footer>
    </main>
  );
}
