import React from "react";
import { phaseMeta, formatAltitude, formatDistance, formatSpeed } from "../geo.js";

function FlightCard({ ac, selected, onSelect }) {
  const meta = phaseMeta(ac.phase);
  return (
    <button
      type="button"
      className={`flight-card ${selected ? "flight-card--selected" : ""}`}
      onClick={() => onSelect(ac.hex)}
      style={selected ? { borderColor: meta.color } : undefined}
    >
      <span className="flight-card__bar" style={{ background: meta.color }} />
      <div className="flight-card__main">
        <div className="flight-card__top">
          <span className="flight-card__call">
            {ac.callsign || ac.registration || ac.hex}
          </span>
          <span className="flight-card__dist">{formatDistance(ac.distance_km)}</span>
        </div>
        <div className="flight-card__sub">
          <span>{ac.aircraft_type || "—"}</span>
          <span className="flight-card__phase" style={{ color: meta.color }}>
            {meta.label}
          </span>
        </div>
        <div className="flight-card__metrics">
          <span>{formatAltitude(ac.altitude)}</span>
          <span>{formatSpeed(ac.speed)}</span>
        </div>
      </div>
    </button>
  );
}

export default function FlightCards({ arrivals, selectedHex, onSelect, status }) {
  return (
    <div className="panel panel--cards">
      <div className="cards__header">
        <span>Inbound Traffic</span>
        <span className="cards__count">{arrivals.length}</span>
      </div>

      {arrivals.length === 0 ? (
        <div className="cards__empty">
          {status === "loading" ? (
            <>
              <div className="spinner" />
              <p>Scanning Mumbai airspace…</p>
            </>
          ) : (
            <>
              <div className="empty-icon">✈</div>
              <p className="empty-title">No live arrivals currently detected</p>
              <p className="empty-sub">No airborne aircraft are inbound to BOM within 100 km right now.</p>
            </>
          )}
        </div>
      ) : (
        <div className="cards__list">
          {arrivals.map((ac) => (
            <FlightCard
              key={ac.hex}
              ac={ac}
              selected={ac.hex === selectedHex}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
