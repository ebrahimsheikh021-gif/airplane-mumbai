import React from "react";
import {
  phaseMeta,
  formatAltitude,
  formatSpeed,
  formatHeading,
  formatDistance,
  formatSeen,
} from "../geo.js";

function StatusDot({ status }) {
  const cls =
    status === "ok" ? "status-dot status-dot--live" : status === "loading" ? "status-dot status-dot--wait" : "status-dot status-dot--err";
  const text = status === "ok" ? "LIVE" : status === "loading" ? "SYNCING" : "OFFLINE";
  return (
    <span className="status">
      <span className={cls} />
      {text}
    </span>
  );
}

function DetailRow({ label, value, accent }) {
  return (
    <div className="detail-row">
      <span className="detail-row__label">{label}</span>
      <span className="detail-row__value" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
    </div>
  );
}

export default function Dashboard({ count, status, lastUpdated, selected }) {
  const meta = selected ? phaseMeta(selected.phase) : null;

  return (
    <div className="panel panel--dashboard">
      <div className="brand">
        <div className="brand__radar" aria-hidden>
          <span className="brand__sweep" />
        </div>
        <div className="brand__text">
          <h1>BOM Live Arrivals</h1>
          <p>Mumbai · Chhatrapati Shivaji Maharaj Intl · VABB</p>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="stat__value">{count}</span>
          <span className="stat__label">Arrivals in range</span>
        </div>
        <div className="stat stat--right">
          <StatusDot status={status} />
          <span className="stat__updated">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Awaiting data…"}
          </span>
        </div>
      </div>

      <div className="selected">
        <div className="selected__header">Selected Aircraft</div>
        {selected ? (
          <div className="selected__body">
            <div className="selected__title">
              <span className="selected__call">
                {selected.callsign || selected.registration || selected.hex}
              </span>
              <span className="selected__phase" style={{ background: meta.color }}>
                {meta.label}
              </span>
            </div>
            <p className="selected__type">
              {selected.description || selected.aircraft_type || "Unknown type"}
              {selected.registration ? ` · ${selected.registration}` : ""}
            </p>
            <div className="detail-grid">
              <DetailRow label="Altitude" value={formatAltitude(selected.altitude)} accent={meta.color} />
              <DetailRow label="Distance" value={formatDistance(selected.distance_km)} />
              <DetailRow label="Ground speed" value={formatSpeed(selected.speed)} />
              <DetailRow label="Heading" value={formatHeading(selected.heading)} />
              <DetailRow label="Type code" value={selected.aircraft_type || "--"} />
              <DetailRow label="Last seen" value={formatSeen(selected.seen)} />
            </div>
          </div>
        ) : (
          <div className="selected__empty">
            Tap a plane in the radar or a flight card to inspect its approach.
          </div>
        )}
      </div>
    </div>
  );
}
