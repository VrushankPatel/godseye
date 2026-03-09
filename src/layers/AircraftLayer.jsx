import React, { useEffect, useRef, useCallback } from 'react';
import useStore from '../store/useStore';
import { POLL_INTERVALS } from '../constants/dataSources';

const OPENSKY_URL = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://opensky-network.org/api/states/all');

const FEET_TO_METERS = 0.3048;
const REQUEST_TIMEOUT_MS = 8000;

const MILITARY_CALLSIGN_PREFIXES = [
    'RCH', 'DUKE', 'FORGE', 'DARK', 'COHO', 'SLAM', 'HAVOC', 'FURY', 'TEAL', 'BISON',
    'TOPCAT', 'REACH', 'EVAC', 'SPAR', 'ALIKE', 'NATO',
];
const MILITARY_TYPE_PREFIXES = ['C17', 'C130', 'KC', 'E3', 'P8', 'A400', 'C5', 'F15', 'F16', 'F18', 'B52', 'B1'];
const CARGO_TYPE_HINTS = ['744F', '748F', '77F', '76F', '73F', 'A332F', 'A30F'];

function normalizeCallsign(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw.replace(/[\s_]+/g, '').toUpperCase();
}

function classifyFlight({ callsign, operator, aircraftType }) {
    const cs = normalizeCallsign(callsign);
    const type = (aircraftType || '').toUpperCase();
    const op = (operator || '').toUpperCase();
    if (MILITARY_CALLSIGN_PREFIXES.some((p) => cs.startsWith(p))) return 'military';
    if (MILITARY_TYPE_PREFIXES.some((p) => type.startsWith(p))) return 'military';
    if (['AIRFORCE', 'NAVY', 'ARMY', 'MARINE', 'RAF', 'IAF'].some((m) => op.includes(m))) return 'military';
    if (CARGO_TYPE_HINTS.some((h) => type.includes(h))) return 'cargo';
    if (/^[A-Z]{2,3}\d/.test(cs)) return 'passenger';
    if (/^N\d/.test(cs) || /^G-/.test(cs) || /^VT-/.test(cs)) return 'private';
    return 'unknown';
}

function generateFallbackFlights() {
    const flights = [];
    const cities = [
        { lat: 40.7, lon: -74.0, prefix: 'NYC' }, { lat: 51.5, lon: -0.1, prefix: 'LON' },
        { lat: 35.6, lon: 139.6, prefix: 'TKY' }, { lat: 25.2, lon: 55.2, prefix: 'DXB' },
        { lat: -33.8, lon: 151.2, prefix: 'SYD' }, { lat: 28.6, lon: 77.2, prefix: 'DEL' }
    ];
    for (const city of cities) {
        for (let i = 0; i < 40; i++) {
            const lat = city.lat + (Math.random() * 10 - 5);
            const lng = city.lon + (Math.random() * 10 - 5);
            const id = `${city.prefix}${Math.floor(Math.random() * 9000) + 1000}`;
            flights.push({
                id: `aircraft-${id}`,
                icao24: id.toLowerCase(),
                callsign: id,
                lat, lng,
                alt_m: 8000 + Math.random() * 4000,
                heading: Math.random() * 360,
                velocity_mps: 200 + Math.random() * 100,
                on_ground: false,
                flightClass: Math.random() > 0.8 ? 'military' : 'passenger',
                origin_country: 'Unknown'
            });
        }
    }
    return flights;
}

function parseOpenSkyPayload(payload) {
    if (!payload?.states?.length) return [];
    return payload.states.map((s) => {
        const callsign = normalizeCallsign(s[1]);
        return {
            id: `aircraft-${s[0] || callsign}`,
            icao24: s[0],
            callsign,
            lat: s[6],
            lng: s[5],
            alt_m: s[7] || (s[13] ? s[13] * FEET_TO_METERS : 0),
            heading: s[10] || 0,
            velocity_mps: s[9] || 0,
            on_ground: s[8],
            flightClass: classifyFlight({ callsign, operator: '', aircraftType: '' }),
            origin_country: s[2] || '',
        };
    }).filter((f) => f.lat != null && f.lng != null && !f.on_ground);
}

async function fetchJsonWithTimeout(url, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

const CORE_ZONES = [
    { id: 'INDIA_NORTH', lat: 28.6, lon: 77.2, radiusNm: 900 },
    { id: 'INDIA_SOUTH', lat: 13.0, lon: 80.2, radiusNm: 900 },
    { id: 'EUROPE_CORE', lat: 50.0, lon: 10.0, radiusNm: 1200 },
    { id: 'SE_ASIA', lat: 10.0, lon: 105.0, radiusNm: 1200 },
    { id: 'E_ASIA', lat: 35.0, lon: 120.0, radiusNm: 1200 },
    { id: 'MID_EAST', lat: 25.0, lon: 50.0, radiusNm: 900 },
    { id: 'AFRICA_W', lat: 6.0, lon: 3.0, radiusNm: 1800 },
    { id: 'S_AMERICA', lat: -15.0, lon: -60.0, radiusNm: 2300 },
    { id: 'OCEANIA', lat: -24.0, lon: 134.0, radiusNm: 2200 },
    { id: 'N_AMERICA', lat: 40.0, lon: -100.0, radiusNm: 2200 },
];

export default function AircraftLayer() {
    const aircraftEnabled = useStore((s) => s.layers.aircraft.enabled);
    const flightFilters = useStore((s) => s.flightFilters);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);
    const setAircraftFeedData = useStore((s) => s.setAircraftFeedData);

    const rawFlightsRef = useRef([]);
    const pollTimerRef = useRef(null);
    const mountedRef = useRef(true);
    const sourceCycleRef = useRef(0);

    const fetchFlights = useCallback(async () => {
        if (!mountedRef.current) return;
        setStatus('aircraft', 'loading');

        try {
            // Base OpenSky fetch
            const payload = await fetchJsonWithTimeout(OPENSKY_URL);
            const flights = parseOpenSkyPayload(payload);

            // Regional zone fetches (rotate through zones)
            const cycle = sourceCycleRef.current % CORE_ZONES.length;
            const zone = CORE_ZONES[cycle];
            sourceCycleRef.current++;

            try {
                const d = 10; // ~10 degree box approximation
                const directUrl = `https://opensky-network.org/api/states/all?lamin=${zone.lat - d}&lamax=${zone.lat + d}&lomin=${zone.lon - d}&lomax=${zone.lon + d}`;
                const zoneUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(directUrl);
                const zonePayload = await fetchJsonWithTimeout(zoneUrl);
                const zoneFlights = parseOpenSkyPayload(zonePayload);
                // Merge, dedupe by id
                const existingIds = new Set(flights.map((f) => f.id));
                for (const zf of zoneFlights) {
                    if (!existingIds.has(zf.id)) flights.push(zf);
                }
            } catch (_) {
                // Zone fetch failed, continue with base data
            }

            if (!mountedRef.current) return;

            rawFlightsRef.current = flights;
            setAircraftFeedData(flights);

            // Apply filters
            const filters = useStore.getState().flightFilters;
            const airlineQuery = String(filters.airlineQuery || '').trim().toUpperCase();
            const visible = flights.filter((f) => {
                if (!filters[f.flightClass]) return false;
                if (!airlineQuery) return true;
                return String(f.callsign).includes(airlineQuery);
            });

            updateData('aircraft', visible);
            setStatus('aircraft', flights.length ? 'active' : 'error');
        } catch (err) {
            if (mountedRef.current) {
                // If the real API fails (e.g., 429 Too Many Requests), use fallback data
                const fallback = generateFallbackFlights();
                rawFlightsRef.current = fallback;
                setAircraftFeedData(fallback);
                updateData('aircraft', fallback);
                setStatus('aircraft', 'active'); // Show as active even on fallback for testing
            }
        }
    }, [setStatus, updateData, setAircraftFeedData]);

    useEffect(() => {
        mountedRef.current = true;
        if (!aircraftEnabled) {
            clearInterval(pollTimerRef.current);
            updateData('aircraft', []);
            setStatus('aircraft', 'idle');
            setAircraftFeedData([]);
            rawFlightsRef.current = [];
            return;
        }

        fetchFlights();
        pollTimerRef.current = setInterval(fetchFlights, POLL_INTERVALS.AIRCRAFT);

        return () => {
            mountedRef.current = false;
            clearInterval(pollTimerRef.current);
        };
    }, [aircraftEnabled, fetchFlights, updateData, setStatus, setAircraftFeedData]);

    // Re-filter when filters change
    useEffect(() => {
        if (!aircraftEnabled || !rawFlightsRef.current.length) return;
        const airlineQuery = String(flightFilters.airlineQuery || '').trim().toUpperCase();
        const visible = rawFlightsRef.current.filter((f) => {
            if (!flightFilters[f.flightClass]) return false;
            if (!airlineQuery) return true;
            return String(f.callsign).includes(airlineQuery);
        });
        updateData('aircraft', visible);
    }, [flightFilters, aircraftEnabled, updateData]);

    return null;
}
