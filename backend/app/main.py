from __future__ import annotations

import math
import time
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


BOM_LAT = 19.0896
BOM_LON = 72.8656
AIRPLANES_LIVE_URL = "https://api.airplanes.live/v2/point/19.0896/72.8656/54"
CACHE_TTL_SECONDS = 20
MAX_DISTANCE_KM = 100.0
MAX_ARRIVAL_ALTITUDE_FT = 20_000


class AircraftArrival(BaseModel):
    callsign: str
    registration: str | None = None
    aircraft_type: str | None = None
    lat: float
    lon: float
    altitude: int
    speed: float | None = None
    heading: float | None = None
    distance_from_bom: float = Field(description="Distance from BOM in kilometers")
    seen_time: float | None = Field(default=None, description="Seconds since aircraft was seen")
    phase: str


class ArrivalsResponse(BaseModel):
    airport: str = "BOM/VABB"
    source: str = "Airplanes.live"
    cached: bool
    last_updated: str
    arrivals: list[AircraftArrival]


app = FastAPI(
    title="BOM Live Arrivals 3D API",
    description="Live commercial arrivals near Mumbai Airport using Airplanes.live.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)


_cache: dict[str, Any] = {
    "expires_at": 0.0,
    "response": None,
}


def _normalize_callsign(value: Any) -> str | None:
    if not isinstance(value, str):
        return None

    callsign = value.strip().upper()
    if not callsign:
        return None

    blocked_prefixes = ("TEST", "0000", "ZZZ")
    if callsign.startswith(blocked_prefixes):
        return None

    return callsign


def _normalize_altitude(value: Any) -> int | None:
    if value is None:
        return None

    if isinstance(value, str):
        if value.lower() == "ground":
            return None
        try:
            return int(float(value))
        except ValueError:
            return None

    if isinstance(value, (int, float)) and math.isfinite(value):
        return int(value)

    return None


def _normalize_float(value: Any) -> float | None:
    if value is None:
        return None

    try:
        normalized = float(value)
    except (TypeError, ValueError):
        return None

    if not math.isfinite(normalized):
        return None

    return normalized


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius_km * c


def _bearing_degrees(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def _heading_difference_degrees(a: float, b: float) -> float:
    return abs((a - b + 180) % 360 - 180)


def _is_likely_tracking_to_bom(
    *,
    lat: float,
    lon: float,
    heading: float | None,
    distance_km: float,
) -> bool:
    if distance_km <= 25:
        return True

    if heading is None:
        return distance_km <= 60

    bearing_to_bom = _bearing_degrees(lat, lon, BOM_LAT, BOM_LON)
    heading_delta = _heading_difference_degrees(heading, bearing_to_bom)
    return heading_delta <= 105


def _phase_for_altitude(altitude_ft: int) -> str:
    if altitude_ft < 1_000:
        return "short_final"
    if altitude_ft < 3_000:
        return "final_approach"
    if altitude_ft < 8_000:
        return "approach"
    return "early_arrival"


def _parse_aircraft(raw_aircraft: dict[str, Any]) -> AircraftArrival | None:
    callsign = _normalize_callsign(raw_aircraft.get("flight"))
    if callsign is None:
        return None

    lat = _normalize_float(raw_aircraft.get("lat"))
    lon = _normalize_float(raw_aircraft.get("lon"))
    if lat is None or lon is None:
        return None

    altitude = _normalize_altitude(raw_aircraft.get("alt_baro"))
    if altitude is None:
        altitude = _normalize_altitude(raw_aircraft.get("alt_geom"))

    if altitude is None or altitude <= 0 or altitude > MAX_ARRIVAL_ALTITUDE_FT:
        return None

    if raw_aircraft.get("ground") is True or str(raw_aircraft.get("alt_baro", "")).lower() == "ground":
        return None

    distance_km = _haversine_km(BOM_LAT, BOM_LON, lat, lon)
    if distance_km > MAX_DISTANCE_KM:
        return None

    heading = _normalize_float(raw_aircraft.get("track"))
    if not _is_likely_tracking_to_bom(lat=lat, lon=lon, heading=heading, distance_km=distance_km):
        return None

    speed = _normalize_float(raw_aircraft.get("gs"))
    seen_time = _normalize_float(raw_aircraft.get("seen_pos"))
    if seen_time is None:
        seen_time = _normalize_float(raw_aircraft.get("seen"))

    return AircraftArrival(
        callsign=callsign,
        registration=raw_aircraft.get("r") or None,
        aircraft_type=raw_aircraft.get("t") or None,
        lat=lat,
        lon=lon,
        altitude=altitude,
        speed=speed,
        heading=heading,
        distance_from_bom=round(distance_km, 1),
        seen_time=seen_time,
        phase=_phase_for_altitude(altitude),
    )


async def _fetch_airplanes_live() -> dict[str, Any]:
    timeout = httpx.Timeout(10.0, connect=5.0)
    headers = {
        "Accept": "application/json",
        "User-Agent": "BOM-Live-Arrivals-3D/1.0",
    }

    async with httpx.AsyncClient(timeout=timeout, headers=headers) as client:
        response = await client.get(AIRPLANES_LIVE_URL)
        response.raise_for_status()
        return response.json()


async def _build_arrivals_response(cached: bool) -> ArrivalsResponse:
    raw = await _fetch_airplanes_live()
    aircraft = raw.get("ac", [])
    if not isinstance(aircraft, list):
        raise HTTPException(status_code=502, detail="Unexpected Airplanes.live response format")

    arrivals = [
        parsed
        for item in aircraft
        if isinstance(item, dict)
        for parsed in [_parse_aircraft(item)]
        if parsed is not None
    ]
    arrivals.sort(key=lambda aircraft_arrival: aircraft_arrival.distance_from_bom)

    return ArrivalsResponse(
        cached=cached,
        last_updated=datetime.now(timezone.utc).isoformat(),
        arrivals=arrivals,
    )


@app.get("/api/arrivals", response_model=ArrivalsResponse)
async def get_arrivals() -> ArrivalsResponse:
    now = time.monotonic()
    cached_response = _cache.get("response")

    if cached_response is not None and now < _cache["expires_at"]:
        cached_response.cached = True
        return cached_response

    try:
        response = await _build_arrivals_response(cached=False)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Airplanes.live returned HTTP {exc.response.status_code}",
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Unable to reach Airplanes.live") from exc

    _cache["response"] = response
    _cache["expires_at"] = now + CACHE_TTL_SECONDS
    return response


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "airport": "BOM/VABB"}
