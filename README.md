# BOM Live Arrivals 3D

A commercial-grade real-time 3D arrivals tracker for **Mumbai Airport (BOM/VABB)**.  
Built with React + Vite + Three.js (@react-three/fiber) on the frontend and FastAPI on the backend.

## Live Data Source

Aircraft data is fetched from the [Airplanes.live](https://airplanes.live) ADS-B API — no mock data.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.10+ |
| Node.js | 18+ |
| npm | 8+ |

---

## Quick Start

```bash
# From the workspace root — starts both backend and frontend
bash start.sh
```

Then open **http://localhost:5173** in your browser.

---

## Manual Setup

### Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API health check: http://localhost:8000/health  
Arrivals endpoint: http://localhost:8000/api/arrivals

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Opens at http://localhost:5173 (proxies `/api` to backend on port 8000).

---

## Architecture

```
workspace/
├── backend/
│   ├── main.py           # FastAPI app with /api/arrivals endpoint
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx                   # Root component + HUD layout
│   │   ├── store.js                  # Zustand state store
│   │   ├── hooks/
│   │   │   └── useArrivals.js        # Polling hook (20s interval)
│   │   ├── utils/
│   │   │   └── geo.js                # Coordinate conversion + helpers
│   │   └── components/
│   │       ├── Scene/
│   │       │   ├── Scene3D.jsx       # R3F Canvas + camera + lights
│   │       │   ├── GridFloor.jsx     # Radar grid + range rings
│   │       │   ├── Runway.jsx        # BOM runway strip
│   │       │   ├── AircraftModel.jsx # Per-aircraft 3D model + label
│   │       │   └── AirportMarker.jsx # BOM origin marker
│   │       └── UI/
│   │           ├── InfoPanel.jsx     # Top-left glass panel
│   │           ├── FlightList.jsx    # Right-side flight cards
│   │           ├── Legend.jsx        # Phase legend (bottom-left)
│   │           └── Compass.jsx       # Compass (bottom-right)
│   └── vite.config.js
└── start.sh              # Unified launcher
```

---

## Features

- **Real-time data** — fetches live ADS-B positions from Airplanes.live every 20 seconds  
- **Backend caching** — 20-second TTL cache prevents rate limiting  
- **Arrival filtering** — only airborne aircraft below 20 000 ft within 100 km of BOM  
- **Phase labels** — Short Final / Final Approach / Approach / Arrival coloured by altitude  
- **3D scene** — colour-coded aircraft models, floating labels, runway, radar rings  
- **Smooth interpolation** — aircraft glide between position updates  
- **Click to select** — click a 3D plane or flight card to show full details  
- **Radar HUD** — glass panels, live status indicator, north compass  
- **Empty state** — clear message when no arrivals are detected

---

## Altitude Phase Reference

| Phase | Altitude Range | Colour |
|-------|---------------|--------|
| Short Final | 0 – 1 000 ft | Red |
| Final Approach | 1 000 – 3 000 ft | Orange |
| Approach | 3 000 – 8 000 ft | Yellow |
| Arrival | 8 000 – 20 000 ft | Cyan |
