import { Scene3D } from './components/Scene/Scene3D';
import { InfoPanel } from './components/UI/InfoPanel';
import { FlightList } from './components/UI/FlightList';
import { Legend } from './components/UI/Legend';
import { Compass } from './components/UI/Compass';
import { useArrivals } from './hooks/useArrivals';

export default function App() {
  useArrivals();

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 3D scene fills the entire background */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <Scene3D />
      </div>

      {/* HUD overlay layer */}
      <InfoPanel />
      <FlightList />
      <Legend />
      <Compass />

      {/* Radar scan line effect */}
      <RadarScanLine />
    </div>
  );
}

function RadarScanLine() {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 5,
      background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,8,20,0.35) 100%)',
    }} />
  );
}
