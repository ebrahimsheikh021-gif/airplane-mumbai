import asyncio
import math
import time
from typing import Any, Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="BOM Live Arrivals API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# BOM airport coordinates
BOM_LAT = 19.0896
BOM_LON = 72.8656
BOM_RADIUS_NM = 54  # ~100 km
MAX_DISTANCE_KM = 100.0

# Phase thresholds (feet)
PHASE_SHORT_FINAL = (0, 1000)
PHASE_FINAL_APPROACH = (1000, 3000)
PHASE_APPROACH = (3000, 8000)
PHASE_EARLY_ARRIVAL = (8000, 20000)
MAX_ALTITUDE_FT = 20000

AIRPLANES_LIVE_URL = (
    f"https://api.airplanes.live/v2/point/{BOM_LAT}/{BOM_LON}/{BOM_RADIUS_NM}"
)

# Simple in-memory cache
_cache: dict[str, Any] = {
    "data": None,
    "timestamp": 0.0,
    "ttl": 20.0,
}
_cache_lock = asyncio.Lock()


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return great-circle distance in km between two lat/lon points."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def determine_phase(altitude_ft: float, distance_km: float) -> str:
    if altitude_ft <= PHASE_SHORT_FINAL[1]:
        return "short_final"
    if altitude_ft <= PHASE_FINAL_APPROACH[1]:
        return "final_approach"
    if altitude_ft <= PHASE_APPROACH[1]:
        return "approach"
    return "early_arrival"


def is_likely_arriving(ac: dict) -> bool:
    """Heuristic: aircraft is likely arriving at BOM if airborne and below 20 000 ft."""
    alt_baro = ac.get("alt_baro")
    on_ground = ac.get("on_ground", False)

    # Skip ground aircraft
    if on_ground:
        return False
    # Skip aircraft with no altitude data
    if alt_baro is None:
        return False
    # Handle string 'ground' sentinel from some feeds
    if isinstance(alt_baro, str):
        return False
    try:
        alt = float(alt_baro)
    except (TypeError, ValueError):
        return False

    return 0 <= alt <= MAX_ALTITUDE_FT


def parse_aircraft(ac: dict, distance_km: float) -> Optional[dict]:
    """Extract and validate fields from a raw aircraft dict."""
    lat = ac.get("lat")
    lon = ac.get("lon")
    if lat is None or lon is None:
        return None

    alt_baro = ac.get("alt_baro", 0)
    try:
        altitude_ft = float(alt_baro)
    except (TypeError, ValueError):
        return None

    gs = ac.get("gs")
    try:
        speed_kts = float(gs) if gs is not None else None
    except (TypeError, ValueError):
        speed_kts = None

    track = ac.get("track")
    try:
        heading = float(track) if track is not None else None
    except (TypeError, ValueError):
        heading = None

    callsign = (ac.get("flight") or "").strip() or ac.get("hex", "").upper()
    registration = (ac.get("r") or "").strip() or None
    aircraft_type = (ac.get("t") or "").strip() or None
    seen = ac.get("seen", 0)

    phase = determine_phase(altitude_ft, distance_km)

    return {
        "callsign": callsign,
        "registration": registration,
        "aircraft_type": aircraft_type,
        "lat": lat,
        "lon": lon,
        "altitude_ft": round(altitude_ft),
        "speed_kts": round(speed_kts) if speed_kts is not None else None,
        "heading": round(heading, 1) if heading is not None else None,
        "distance_km": round(distance_km, 2),
        "seen_seconds_ago": seen,
        "phase": phase,
        "hex": ac.get("hex", ""),
    }


async def fetch_from_api() -> list[dict]:
    """Fetch raw aircraft list from Airplanes.live."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            AIRPLANES_LIVE_URL,
            headers={"User-Agent": "BOM-Live-Arrivals/1.0"},
        )
        resp.raise_for_status()
        payload = resp.json()

    raw_aircraft = payload.get("ac", [])
    results = []

    for ac in raw_aircraft:
        if not is_likely_arriving(ac):
            continue

        lat = ac.get("lat")
        lon = ac.get("lon")
        if lat is None or lon is None:
            continue

        dist = haversine_km(BOM_LAT, BOM_LON, float(lat), float(lon))
        if dist > MAX_DISTANCE_KM:
            continue

        parsed = parse_aircraft(ac, dist)
        if parsed:
            results.append(parsed)

    # Sort by distance ascending
    results.sort(key=lambda x: x["distance_km"])
    return results


async def get_arrivals_cached() -> list[dict]:
    async with _cache_lock:
        now = time.monotonic()
        if _cache["data"] is not None and (now - _cache["timestamp"]) < _cache["ttl"]:
            return _cache["data"]

        data = await fetch_from_api()
        _cache["data"] = data
        _cache["timestamp"] = now
        return data


@app.get("/api/arrivals")
async def get_arrivals():
    try:
        arrivals = await get_arrivals_cached()
        return {
            "count": len(arrivals),
            "airport": "BOM",
            "arrivals": arrivals,
            "cached_at": int(time.time()),
        }
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Upstream API error: {exc.response.status_code}")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"Network error: {exc}")


@app.get("/health")
async def health():
    return {"status": "ok", "airport": "BOM", "source": "airplanes.live"}
