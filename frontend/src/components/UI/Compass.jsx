export function Compass() {
  const dirs = [
    { label: 'N', angle: 0 },
    { label: 'E', angle: 90 },
    { label: 'S', angle: 180 },
    { label: 'W', angle: 270 },
  ];

  const size = 64;
  const cx = size / 2;
  const cy = size / 2;
  const r = 26;

  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      right: 300,
      zIndex: 10,
      background: 'var(--surface)',
      border: '1px solid var(--surface-border)',
      borderRadius: '50%',
      width: size + 8,
      height: size + 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(16px)',
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,200,255,0.2)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={2} fill="#00c8ff" />
        {dirs.map(({ label, angle }) => {
          const rad = ((angle - 90) * Math.PI) / 180;
          const x = cx + r * Math.cos(rad);
          const y = cy + r * Math.sin(rad);
          return (
            <text
              key={label}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={label === 'N' ? '#00ff9d' : 'rgba(180,210,240,0.7)'}
              fontSize="9"
              fontFamily="var(--font-mono)"
              fontWeight={label === 'N' ? '700' : '400'}
            >
              {label}
            </text>
          );
        })}
        {/* North arrow */}
        <line x1={cx} y1={cy} x2={cx} y2={cy - r + 6} stroke="#00ff9d" strokeWidth="1.5" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={cx} y2={cy + r - 6} stroke="rgba(180,210,240,0.3)" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </div>
  );
}
