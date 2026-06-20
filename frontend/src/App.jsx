import React, { useEffect, useMemo, useState } from "react";
import Scene from "./components/Scene.jsx";
import Dashboard from "./components/Dashboard.jsx";
import FlightCards from "./components/FlightCards.jsx";
import { useArrivals } from "./useArrivals.js";

export default function App() {
  const { arrivals, count, status, error, lastUpdated } = useArrivals();
  const [selectedHex, setSelectedHex] = useState(null);

  // Keep the selection valid as the list refreshes; clear it if the aircraft
  // has left the coverage area.
  useEffect(() => {
    if (selectedHex && !arrivals.some((a) => a.hex === selectedHex)) {
      setSelectedHex(null);
    }
  }, [arrivals, selectedHex]);

  const selected = useMemo(
    () => arrivals.find((a) => a.hex === selectedHex) || null,
    [arrivals, selectedHex]
  );

  return (
    <div className="app">
      <div className="scene-layer">
        <Scene arrivals={arrivals} selectedHex={selectedHex} onSelect={setSelectedHex} />
      </div>

      <div className="vignette" aria-hidden />

      <div className="ui-layer">
        <Dashboard
          count={count}
          status={status}
          lastUpdated={lastUpdated}
          selected={selected}
        />

        <FlightCards
          arrivals={arrivals}
          selectedHex={selectedHex}
          onSelect={setSelectedHex}
          status={status}
        />
      </div>

      <div className="footer-hint">
        Drag to orbit · Scroll to zoom · Data via Airplanes.live
        {error && status !== "ok" ? ` · ${error}` : ""}
      </div>
    </div>
  );
}
