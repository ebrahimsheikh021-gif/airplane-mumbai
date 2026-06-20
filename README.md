# BOM Live Arrivals 3D

A real-time **3D arrivals radar** for **Mumbai – Chhatrapati Shivaji Maharaj International Airport (BOM / VABB)**.
It visualises only the commercial aircraft that are **arriving** into Mumbai, using live ADS-B data
from the [Airplanes.live](https://airplanes.live/) API, rendered in a premium dark radar-style 3D scene.

![stack](https://img.shields.io/badge/React-Vite-61dafb) ![three](https://img.shields.io/badge/Three.js-r3f-black) ![api](https://img.shields.io/badge/FastAPI-Python-009688)

---

## Features

- **Live data only** — real aircraft from Airplanes.live, proxied through the backend. No mock data.
- **Smart arrival filtering** — airborne aircraft only, within 100 km of BOM, below 20,000 ft, ground traffic excluded, commercial flights with callsigns prioritised.
- **Approach phase labels** — `short_final`, `final_approach`, `approach`, `early_arrival`.
- **3D radar scene** — grid floor, range rings (25/50/75/100 km), a labelled **BOM Runway**, and aircraft modelled as 3D airliners positioned from real lat/lon, with altitude controlling height and heading controlling rotation.
- **Smooth interpolation** between 20-second updates.
- **Glass dashboard** — app name, live arrival count, last-updated time, and full selected-aircraft details.
- **Flight cards** — inbound traffic list on the right; click a plane *or* a card to select it.
- **Backend caching** — upstream API cached for 20s to respect rate limits, with stale-on-error fallback.
- **Clear empty state** — *"No live arrivals currently detected"* when the API returns nothing.

---

## Architecture

```
Browser (React + Three.js)  ──/api/arrivals──▶  FastAPI backend  ──▶  Airplanes.live API
        every 20s                                  (20s cache)        /v2/point/19.0896/72.8656/54
```

- **Backend** (`backend/main.py`): fetches near-BOM traffic, filters/transforms to arrivals, caches 20s.
- **Frontend** (`frontend/`): polls `/api/arrivals`, projects coordinates into the 3D scene, renders UI.

---

## Prerequisites

- **Python** 3.10+
- **Node.js** 18+ and npm

---

## Running locally

The app has two parts. Run each in its own terminal.

### 1. Backend (FastAPI)

```bash
cd backend
python3 -m venv venv          # optional but recommended
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API is now live at `http://localhost:8000/api/arrivals`.

> If you cannot create a virtualenv, install the deps directly:
> `pip install -r requirements.txt` (add `--user` or `--break-system-packages` if needed).

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

Vite proxies `/api/*` to the backend on port 8000 (see `frontend/vite.config.js`), so no extra config is needed for local development.

---

## API reference

### `GET /api/arrivals`

Returns arriving aircraft near BOM.

```jsonc
{
  "airport": { "icao": "VABB", "iata": "BOM", "lat": 19.0896, "lon": 72.8656 },
  "count": 10,
  "updated_at": 1781945534,
  "cached": false,
  "arrivals": [
    {
      "hex": "801878",
      "callsign": "IGO416P",
      "registration": "VT-NHO",
      "aircraft_type": "A21N",
      "description": "AIRBUS A-321neo",
      "lat": 19.089432,
      "lon": 72.920085,
      "altitude": 975,            // feet
      "speed": 127.0,             // knots (ground speed)
      "heading": 267.5,           // degrees
      "vertical_rate": -512,      // ft/min
      "distance_km": 5.73,
      "phase": "short_final",
      "seen": 0.8,                // seconds since last message
      "has_callsign": true
    }
  ]
}
```

### `GET /api/health`

Simple liveness probe → `{ "status": "ok" }`.

---

## Configuration

Key constants live at the top of `backend/main.py`:

| Constant | Default | Meaning |
| --- | --- | --- |
| `BOM_LAT` / `BOM_LON` | 19.0896 / 72.8656 | Airport reference point |
| `QUERY_RADIUS_NM` | 54 | Upstream query radius (~100 km) |
| `MAX_DISTANCE_KM` | 100 | Arrival inclusion radius |
| `MAX_ARRIVAL_ALTITUDE_FT` | 20000 | Upper altitude cutoff for arrivals |
| `CACHE_TTL_SECONDS` | 20 | Upstream cache duration |

Scene scale/projection tuning lives in `frontend/src/geo.js` (`KM_PER_UNIT`, `FEET_PER_UNIT`).

---

## Notes

- Data source: **Airplanes.live** only. OpenSky is intentionally **not** used.
- The visual altitude is exaggerated vertically (configurable) so the approach is readable on screen.
- "Arrivals" are inferred from proximity + altitude + airborne state; without a flight-plan feed there is no perfect departures/arrivals split, so fast climbing traffic may briefly appear until it leaves the 20,000 ft / 100 km window.
