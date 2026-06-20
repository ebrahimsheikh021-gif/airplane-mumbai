"""
BOM Live Arrivals 3D - FastAPI backend.

Provides a single endpoint, ``/api/arrivals``, that fetches live aircraft near
Chhatrapati Shivaji Maharaj International Airport (BOM / VABB) from the
Airplanes.live API, filters them down to flights that are likely arriving, and
returns a clean, frontend-friendly payload.

The upstream API response is cached for 20 seconds to stay well within the
provider's fair-use limits.
"""

from __future__ import annotations

import math
import time
from typing import Any, Optional

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- Airport / query configuration -----------------------------------------

# BOM (Chhatrapati Shivaji Maharaj Intl) reference coordinates.
BOM_LAT = 19.0896
BOM_LON = 72.8656

# Airplanes.live "point" endpoint takes a radius in nautical miles.
# 54 nm is roughly the 100 km radius requested.
QUERY_RADIUS_NM = 54
AIRPLANES_LIVE_URL = (
    f"https://api.airplanes.live/v2/point/{BOM_LAT}/{BOM_LON}/{QUERY_RADIUS_NM}"
)

# Arrival filtering thresholds.
MAX_DISTANCE_KM = 100.0
MAX_ARRIVAL_ALTITUDE_FT = 20000

# Cache configuration.
CACHE_TTL_SECONDS = 20
REQUEST_TIMEOUT_SECONDS = 15

# A descriptive User-Agent is requested by the Airplanes.live API guidelines.
HTTP_HEADERS = {
    "User-Agent": "BOM-Live-Arrivals-3D/1.0 (real-time arrivals visualizer)",
    "Accept": "application/json",
}

app = FastAPI(title="BOM Live Arrivals 3D API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Simple in-process cache -------------------------------------------------

_cache: dict[str, Any] = {"timestamp": 0.0, "payload": None}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two lat/lon points in kilometres."""
    earth_radius_km = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    return earth_radius_km * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def classify_phase(altitude_ft: float) -> str:
    """Map an altitude (feet) to an approach phase label."""
    if altitude_ft <= 1000:
        return "short_final"
    if altitude_ft <= 3000:
        return "final_approach"
    if altitude_ft <= 8000:
        return "approach"
    return "early_arrival"


def _parse_altitude(raw: Any) -> Optional[float]:
    """Parse an ``alt_baro`` value.

    The API uses the string ``"ground"`` for aircraft on the ground, which we
    treat as "no usable airborne altitude" (returns ``None``).
    """
    if raw is None:
        return None
    if isinstance(raw, str):
        if raw.strip().lower() == "ground":
            return None
        try:
            return float(raw)
        except ValueError:
            return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def _clean_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def transform_aircraft(ac: dict[str, Any]) -> Optional[dict[str, Any]]:
    """Convert a raw Airplanes.live record into our arrival schema.

    Returns ``None`` when the aircraft should be excluded (on the ground,
    missing position, too high, too far, or otherwise not an arrival).
    """
    lat = ac.get("lat")
    lon = ac.get("lon")
    if lat is None or lon is None:
        return None

    raw_alt = ac.get("alt_baro")
    # Exclude aircraft explicitly reported on the ground.
    if isinstance(raw_alt, str) and raw_alt.strip().lower() == "ground":
        return None

    altitude = _parse_altitude(raw_alt)
    if altitude is None:
        # No usable airborne altitude -> cannot treat as an airborne arrival.
        return None

    # Only aircraft that are descending toward / approaching BOM.
    if altitude > MAX_ARRIVAL_ALTITUDE_FT:
        return None

    distance_km = haversine_km(BOM_LAT, BOM_LON, float(lat), float(lon))
    if distance_km > MAX_DISTANCE_KM:
        return None

    callsign = _clean_str(ac.get("flight"))
    registration = _clean_str(ac.get("r"))
    aircraft_type = _clean_str(ac.get("t"))
    description = _clean_str(ac.get("desc"))

    # Heading: prefer true heading, then magnetic heading, then track.
    heading = (
        ac.get("true_heading")
        if ac.get("true_heading") is not None
        else ac.get("mag_heading")
        if ac.get("mag_heading") is not None
        else ac.get("track")
    )

    speed = ac.get("gs")  # ground speed in knots

    return {
        "hex": _clean_str(ac.get("hex")),
        "callsign": callsign,
        "registration": registration,
        "aircraft_type": aircraft_type,
        "description": description,
        "lat": float(lat),
        "lon": float(lon),
        "altitude": round(altitude),
        "speed": round(float(speed), 1) if speed is not None else None,
        "heading": round(float(heading), 1) if heading is not None else None,
        "vertical_rate": ac.get("baro_rate"),
        "distance_km": round(distance_km, 2),
        "phase": classify_phase(altitude),
        "seen": ac.get("seen"),
        "has_callsign": callsign is not None,
    }


async def fetch_raw_aircraft() -> list[dict[str, Any]]:
    """Fetch the raw aircraft list from Airplanes.live."""
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
        response = await client.get(AIRPLANES_LIVE_URL, headers=HTTP_HEADERS)
        response.raise_for_status()
        data = response.json()
    return data.get("ac", []) or []


def build_payload(raw_aircraft: list[dict[str, Any]]) -> dict[str, Any]:
    """Filter, transform and sort arrivals into the response payload."""
    arrivals: list[dict[str, Any]] = []
    for ac in raw_aircraft:
        transformed = transform_aircraft(ac)
        if transformed is not None:
            arrivals.append(transformed)

    # Prefer commercial flights that broadcast a callsign: those come first,
    # then everything is ordered by proximity to the airport.
    arrivals.sort(key=lambda a: (not a["has_callsign"], a["distance_km"]))

    return {
        "airport": {"icao": "VABB", "iata": "BOM", "lat": BOM_LAT, "lon": BOM_LON},
        "count": len(arrivals),
        "updated_at": int(time.time()),
        "arrivals": arrivals,
    }


@app.get("/api/arrivals")
async def get_arrivals() -> dict[str, Any]:
    """Return live arriving aircraft near BOM (cached for 20s)."""
    now = time.time()
    cached_payload = _cache.get("payload")
    if cached_payload is not None and (now - _cache["timestamp"]) < CACHE_TTL_SECONDS:
        return {**cached_payload, "cached": True}

    try:
        raw_aircraft = await fetch_raw_aircraft()
        payload = build_payload(raw_aircraft)
        _cache["payload"] = payload
        _cache["timestamp"] = now
        return {**payload, "cached": False}
    except (httpx.HTTPError, ValueError) as exc:
        # On upstream failure, serve stale cache if we have it.
        if cached_payload is not None:
            return {**cached_payload, "cached": True, "stale": True}
        return {
            "airport": {"icao": "VABB", "iata": "BOM", "lat": BOM_LAT, "lon": BOM_LON},
            "count": 0,
            "updated_at": int(now),
            "arrivals": [],
            "error": f"Upstream fetch failed: {exc}",
        }


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
