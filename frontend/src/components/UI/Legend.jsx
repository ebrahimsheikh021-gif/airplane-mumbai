const PHASES = [
  { phase: 'short_final', color: '#ff4444', label: 'Short Final', range: '0–1,000 ft' },
  { phase: 'final_approach', color: '#ff8c00', label: 'Final Approach', range: '1,000–3,000 ft' },
  { phase: 'approach', color: '#ffd700', label: 'Approach', range: '3,000–8,000 ft' },
  { phase: 'early_arrival', color: '#00c8ff', label: 'Arrival', range: '8,000–20,000 ft' },
];

export function Legend() {
  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: 20,
      zIndex: 10,
      background: 'var(--surface)',
      border: '1px solid var(--surface-border)',
      borderRadius: '10px',
      padding: '12px 16px',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.12em', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>
        ALTITUDE PHASE
      </div>
      {PHASES.map(({ color, label, range }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: color,
            boxShadow: `0 0 6px ${color}`,
            flexShrink: 0,
          }} />
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: 9, color: 'var(--text-dim)', marginLeft: 6, fontFamily: 'var(--font-mono)' }}>{range}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
