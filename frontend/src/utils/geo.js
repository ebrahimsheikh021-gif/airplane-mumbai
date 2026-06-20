// BOM airport reference point
export const BOM_LAT = 19.0896;
export const BOM_LON = 72.8656;

// Scale: how many Three.js units per km
export const KM_PER_UNIT = 0.1; // 1 unit = 10 km

// Altitude scale: feet to Three.js Y units
export const FT_PER_UNIT = 500; // 1 unit = 500 ft

export const MAX_ALT_FT = 20000;
export const MAX_ALT_UNITS = MAX_ALT_FT / FT_PER_UNIT; // 40

/**
 * Convert lat/lon offset from BOM to local XZ coordinates.
 * Returns { x, z } in Three.js scene units.
 */
export function latLonToLocal(lat, lon) {
  // Approximate equirectangular projection near BOM
  const dLat = lat - BOM_LAT;
  const dLon = lon - BOM_LON;

  // 1 degree lat ≈ 111 km; 1 degree lon ≈ 111 * cos(lat) km
  const kmPerDegLat = 111.0;
  const kmPerDegLon = 111.0 * Math.cos((BOM_LAT * Math.PI) / 180);

  const dx_km = dLon * kmPerDegLon;
  const dz_km = -dLat * kmPerDegLat; // negate so north is +Z in our scene

  return {
    x: dx_km * KM_PER_UNIT,
    z: dz_km * KM_PER_UNIT,
  };
}

export function altitudeToY(ft) {
  return Math.max(0.1, ft / FT_PER_UNIT);
}

export function phaseColor(phase) {
  switch (phase) {
    case 'short_final': return '#ff4444';
    case 'final_approach': return '#ff8c00';
    case 'approach': return '#ffd700';
    case 'early_arrival': return '#00c8ff';
    default: return '#00c8ff';
  }
}

export function phaseLabel(phase) {
  switch (phase) {
    case 'short_final': return 'SHORT FINAL';
    case 'final_approach': return 'FINAL APPROACH';
    case 'approach': return 'APPROACH';
    case 'early_arrival': return 'ARRIVAL';
    default: return 'ARRIVAL';
  }
}

export function formatAltitude(ft) {
  if (ft == null) return '---';
  if (ft < 1000) return `${ft} ft`;
  return `${(ft / 1000).toFixed(1)}k ft`;
}

export function formatSpeed(kts) {
  if (kts == null) return '---';
  return `${kts} kts`;
}

export function formatDistance(km) {
  if (km == null) return '---';
  return `${km.toFixed(1)} km`;
}

/**
 * Interpolate between two positions.
 */
export function lerpVec(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}
