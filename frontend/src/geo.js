// Geo + projection helpers shared between the scene and the dashboard.

export const BOM = { lat: 19.0896, lon: 72.8656 };

// Scene scale: how many Three.js world units represent 1 kilometre on the
// ground plane. The radar covers ~100 km, so this keeps the scene a sensible
// size for the camera.
export const KM_PER_UNIT = 1.4;

// Vertical exaggeration. Real altitudes (in feet) are tiny compared to the
// 100 km horizontal span, so we scale them up to make the approach readable.
// 1 unit of height ~ this many feet.
export const FEET_PER_UNIT = 600;

const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// Convert a lat/lon into local east/north offsets (in km) relative to BOM,
// using an equirectangular approximation (accurate enough at this scale).
export function latLonToKm(lat, lon) {
  const dLat = toRad(lat - BOM.lat);
  const dLon = toRad(lon - BOM.lon);
  const north = dLat * EARTH_RADIUS_KM;
  const east = dLon * EARTH_RADIUS_KM * Math.cos(toRad(BOM.lat));
  return { east, north };
}

// Map an aircraft's real-world position to a Three.js [x, y, z] coordinate.
// X = east, Z = -north (so north points "into" the screen / away), Y = height.
export function projectAircraft(lat, lon, altitudeFt) {
  const { east, north } = latLonToKm(lat, lon);
  const x = east / KM_PER_UNIT;
  const z = -north / KM_PER_UNIT;
  const y = Math.max(0, (altitudeFt || 0) / FEET_PER_UNIT);
  return [x, y, z];
}

export const PHASE_META = {
  short_final: { label: "Short Final", color: "#ff5470", order: 0 },
  final_approach: { label: "Final Approach", color: "#ff9f43", order: 1 },
  approach: { label: "Approach", color: "#feca57", order: 2 },
  early_arrival: { label: "Early Arrival", color: "#48dbfb", order: 3 },
};

export function phaseMeta(phase) {
  return PHASE_META[phase] || { label: phase || "Unknown", color: "#8ea3c0", order: 9 };
}

export function formatAltitude(ft) {
  if (ft == null) return "--";
  return `${Math.round(ft).toLocaleString()} ft`;
}

export function formatSpeed(kts) {
  if (kts == null) return "--";
  return `${Math.round(kts)} kts`;
}

export function formatHeading(deg) {
  if (deg == null) return "--";
  return `${Math.round(deg)}°`;
}

export function formatDistance(km) {
  if (km == null) return "--";
  return `${km.toFixed(1)} km`;
}

export function formatSeen(seconds) {
  if (seconds == null) return "--";
  if (seconds < 60) return `${Math.round(seconds)}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}
