import { useStore } from '../../store';
import { formatAltitude, formatSpeed, formatDistance, phaseColor, phaseLabel } from '../../utils/geo';

function formatTime(date) {
  if (!date) return '---';
  return date.toLocaleTimeString('en-IN', { hour12: false });
}

function PhaseTag({ phase }) {
  const color = phaseColor(phase);
  const label = phaseLabel(phase);
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '3px',
      background: color + '22',
      border: `1px solid ${color}55`,
      color: color,
      fontSize: '10px',
      fontFamily: 'var(--font-mono)',
      letterSpacing: '0.08em',
      fontWeight: 600,
    }}>
      {label}
    </span>
  );
}

export function InfoPanel() {
  const arrivals = useStore((s) => s.arrivals);
  const lastUpdated = useStore((s) => s.lastUpdated);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.error);
  const selectedHex = useStore((s) => s.selectedHex);
  const selected = useStore((s) => s.getSelectedAircraft());

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      left: 20,
      zIndex: 10,
      width: 280,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* App title card */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--surface-border)',
        borderRadius: '12px',
        padding: '16px 20px',
        backdropFilter: 'blur(16px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: loading ? '#ffb300' : error ? '#ff4444' : '#00ff9d',
            boxShadow: `0 0 8px ${loading ? '#ffb300' : error ? '#ff4444' : '#00ff9d'}`,
            flexShrink: 0,
            animation: loading ? 'none' : 'pulse 2s infinite',
          }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}>
            {loading ? 'UPDATING...' : error ? 'ERROR' : 'LIVE'}
          </span>
        </div>

        <h1 style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#e8f4ff',
          letterSpacing: '-0.01em',
          lineHeight: 1.2,
          marginBottom: 2,
        }}>
          BOM Live Arrivals
          <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 400, marginLeft: 6 }}>3D</span>
        </h1>

        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 12 }}>
          Mumbai Chhatrapati Shivaji International
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <StatBox label="ARRIVALS" value={arrivals.length} color="var(--accent)" />
          <StatBox label="UPDATED" value={formatTime(lastUpdated)} color="var(--text-secondary)" small />
        </div>

        {error && (
          <div style={{ marginTop: 10, padding: '8px 10px', background: '#ff444414', borderRadius: 6, border: '1px solid #ff444433' }}>
            <span style={{ fontSize: 11, color: '#ff6666' }}>{error}</span>
          </div>
        )}
      </div>

      {/* Selected aircraft details */}
      {selected && (
        <div style={{
          background: 'var(--surface)',
          border: `1px solid ${phaseColor(selected.phase)}44`,
          borderRadius: '12px',
          padding: '14px 16px',
          backdropFilter: 'blur(16px)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
                {selected.callsign}
              </div>
              {selected.registration && (
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{selected.registration}</div>
              )}
            </div>
            <PhaseTag phase={selected.phase} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <DetailRow label="TYPE" value={selected.aircraft_type || '---'} />
            <DetailRow label="DISTANCE" value={formatDistance(selected.distance_km)} />
            <DetailRow label="ALTITUDE" value={formatAltitude(selected.altitude_ft)} color={phaseColor(selected.phase)} />
            <DetailRow label="SPEED" value={formatSpeed(selected.speed_kts)} />
            <DetailRow label="HEADING" value={selected.heading != null ? `${selected.heading}°` : '---'} />
            <DetailRow label="SEEN" value={selected.seen_seconds_ago != null ? `${selected.seen_seconds_ago}s ago` : '---'} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function StatBox({ label, value, color, small }) {
  return (
    <div style={{
      background: 'rgba(0,200,255,0.04)',
      border: '1px solid rgba(0,200,255,0.1)',
      borderRadius: 8,
      padding: '8px 10px',
    }}>
      <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 3, fontFamily: 'var(--font-mono)' }}>
        {label}
      </div>
      <div style={{ fontSize: small ? 12 : 22, fontWeight: 700, color: color || 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>
    </div>
  );
}

function DetailRow({ label, value, color }) {
  return (
    <div style={{ padding: '5px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 5 }}>
      <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: color || 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>
    </div>
  );
}
