import { useStore } from '../../store';
import { formatAltitude, formatSpeed, formatDistance, phaseColor, phaseLabel } from '../../utils/geo';

const PHASE_ORDER = ['short_final', 'final_approach', 'approach', 'early_arrival'];

export function FlightList() {
  const arrivals = useStore((s) => s.arrivals);
  const selectedHex = useStore((s) => s.selectedHex);
  const setSelected = useStore((s) => s.setSelected);

  if (arrivals.length === 0) {
    return (
      <div style={{
        position: 'absolute',
        right: 20,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 10,
        width: 280,
        background: 'var(--surface)',
        border: '1px solid var(--surface-border)',
        borderRadius: '12px',
        padding: '24px 20px',
        backdropFilter: 'blur(16px)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>✈</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>
          No live arrivals currently detected
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
          Monitoring BOM airspace within 100 km
        </div>
      </div>
    );
  }

  // Group by phase for cleaner display
  const grouped = {};
  PHASE_ORDER.forEach((p) => { grouped[p] = []; });
  arrivals.forEach((ac) => {
    if (grouped[ac.phase]) grouped[ac.phase].push(ac);
    else grouped['early_arrival'].push(ac);
  });

  return (
    <div style={{
      position: 'absolute',
      right: 20,
      top: 20,
      bottom: 20,
      zIndex: 10,
      width: 280,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      overflowY: 'auto',
      paddingRight: 2,
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--surface-border)',
        borderRadius: '12px',
        padding: '12px 16px',
        backdropFilter: 'blur(16px)',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.12em', fontFamily: 'var(--font-mono)' }}>
          INBOUND TRAFFIC
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
          {arrivals.length} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)' }}>aircraft</span>
        </div>
      </div>

      {PHASE_ORDER.map((phase) => {
        const group = grouped[phase];
        if (!group || group.length === 0) return null;
        const color = phaseColor(phase);
        const label = phaseLabel(phase);
        return (
          <div key={phase}>
            <div style={{
              fontSize: 9,
              color: color,
              letterSpacing: '0.14em',
              fontFamily: 'var(--font-mono)',
              padding: '4px 8px',
              opacity: 0.8,
            }}>
              — {label} ({group.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {group.map((ac) => (
                <FlightCard
                  key={ac.hex}
                  aircraft={ac}
                  isSelected={selectedHex === ac.hex}
                  onClick={() => setSelected(selectedHex === ac.hex ? null : ac.hex)}
                />
              ))}
            </div>
          </div>
        );
      })}

      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,200,255,0.2); border-radius: 2px; }
      `}</style>
    </div>
  );
}

function FlightCard({ aircraft, isSelected, onClick }) {
  const color = phaseColor(aircraft.phase);

  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected
          ? `rgba(0,200,255,0.1)`
          : 'var(--surface)',
        border: `1px solid ${isSelected ? color + '88' : 'var(--surface-border)'}`,
        borderRadius: '9px',
        padding: '10px 12px',
        backdropFilter: 'blur(16px)',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = color + '55';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = 'var(--surface-border)';
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        background: color,
        borderRadius: '9px 0 0 9px',
        opacity: isSelected ? 1 : 0.5,
      }} />

      <div style={{ marginLeft: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            color: isSelected ? '#fff' : 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.06em',
          }}>
            {aircraft.callsign}
          </span>
          {aircraft.aircraft_type && (
            <span style={{
              fontSize: 9,
              color: 'var(--text-dim)',
              fontFamily: 'var(--font-mono)',
              background: 'rgba(255,255,255,0.05)',
              padding: '1px 5px',
              borderRadius: 3,
            }}>
              {aircraft.aircraft_type}
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
          <MiniStat label="ALT" value={formatAltitude(aircraft.altitude_ft)} color={color} />
          <MiniStat label="SPD" value={formatSpeed(aircraft.speed_kts)} />
          <MiniStat label="DIST" value={formatDistance(aircraft.distance_km)} />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
        {label}
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: color || 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>
    </div>
  );
}
