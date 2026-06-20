# BOM Live Arrivals 3D

A commercial-style real-time 3D arrivals tracker for Mumbai Airport (BOM/VABB).

The app uses a FastAPI backend to fetch live aircraft near Mumbai from the Airplanes.live API and a React + Vite frontend with Three.js, `@react-three/fiber`, and `@react-three/drei` for the radar-style 3D view.

## Features

- Live Airplanes.live backend integration only
- Backend response caching for 20 seconds to reduce API load
- 100 km radius around Mumbai Airport using the Airplanes.live point endpoint
- Airborne-only filtering, excluding ground aircraft
- Callsign-required commercial arrival preference
- Likely-arrival filtering for aircraft under 20,000 ft and tracking toward BOM
- Phase labels:
  - `short_final`: 0-1000 ft
  - `final_approach`: 1000-3000 ft
  - `approach`: 3000-8000 ft
  - `early_arrival`: 8000-20000 ft
- Premium dark radar dashboard with 3D grid, runway, aircraft labels, flight cards, and live selection
- No mock aircraft by default; if no matching aircraft are found, the UI shows a clear no-arrivals state

## Project structure

```text
backend/
  app/main.py          FastAPI app and /api/arrivals endpoint
  requirements.txt    Python dependencies
frontend/
  src/                 React + Three.js app
  package.json         Frontend scripts and dependencies
```

## Requirements

- Python 3.11+
- Node.js 20+
- npm

## Run locally

### 1. Start the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend endpoints:

- `GET http://localhost:8000/api/health`
- `GET http://localhost:8000/api/arrivals`

### 2. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Visit:

```text
http://localhost:5173
```

The Vite dev server proxies `/api` to `http://127.0.0.1:8000`, so the browser never calls Airplanes.live directly.

## Production build

```bash
cd frontend
npm run build
```

## API source

This project intentionally does not use OpenSky.

Live aircraft are fetched through the backend from:

```text
https://api.airplanes.live/v2/point/19.0896/72.8656/54
```

The `54` radius parameter is nautical miles, approximately 100 km around BOM.
