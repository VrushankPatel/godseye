import React from 'react';
import useStore from '../store/useStore';

const FILTER_CONFIG = [
    { key: 'passenger', label: 'Passenger', color: '#00b4ff' },
    { key: 'cargo', label: 'Cargo', color: '#ffaa00' },
    { key: 'military', label: 'Military', color: '#ff5555' },
    { key: 'private', label: 'Private', color: '#a47bff' },
    { key: 'unknown', label: 'Unknown', color: '#9aa1c4' },
];

export default function FlightFilterPanel() {
    const aircraftEnabled = useStore((s) => s.layers.aircraft.enabled);
    const flights = useStore((s) => s.layers.aircraft.data);
    const flightFilters = useStore((s) => s.flightFilters);
    const setFlightFilter = useStore((s) => s.setFlightFilter);
    const setFlightAirlineQuery = useStore((s) => s.setFlightAirlineQuery);
    const resetFlightFilters = useStore((s) => s.resetFlightFilters);
    const inspector = useStore((s) => s.inspector);

    if (!aircraftEnabled) return null;

    const counts = flights.reduce((acc, flight) => {
        const cls = String(flight.flightClass || 'unknown').toLowerCase();
        acc[cls] = (acc[cls] || 0) + 1;
        return acc;
    }, {});

    return (
        <div
            className={`flight-filter-panel glass-panel pointer-events-auto z-10 ${
                inspector ? 'flight-filter-panel--offset' : ''
            }`}
        >
            <div className="flight-filter-header">
                <span>FLIGHT FILTERS</span>
                <button onClick={resetFlightFilters}>RESET</button>
            </div>

            <div className="flight-filter-search">
                <input
                    type="text"
                    value={flightFilters.airlineQuery}
                    onChange={(event) => setFlightAirlineQuery(event.target.value)}
                    placeholder="Airline / Callsign"
                />
            </div>

            <div className="flight-filter-list">
                {FILTER_CONFIG.map((item) => {
                    const enabled = Boolean(flightFilters[item.key]);
                    const count = counts[item.key] || 0;
                    return (
                        <button
                            key={item.key}
                            className={`flight-filter-chip ${enabled ? 'is-active' : ''}`}
                            onClick={() => setFlightFilter(item.key, !enabled)}
                            style={enabled ? { borderColor: `${item.color}66`, color: item.color } : undefined}
                        >
                            <span>{item.label}</span>
                            <span>{count.toLocaleString()}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
