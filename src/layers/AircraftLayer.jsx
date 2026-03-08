import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const FEET_TO_METERS = 0.3048;
const KNOTS_TO_MPS = 0.514444;
const REQUEST_TIMEOUT_MS = 10000;
const EARTH_RADIUS_M = 6371000;
const ANIMATION_INTERVAL_MS = 350;
const MAX_EXTRAPOLATION_SECONDS = 45;

const MILITARY_CALLSIGN_PREFIXES = [
    'RCH', 'CMB', 'KING', 'DUKE', 'NAVY', 'SPAR', 'NATO', 'QID', 'MMF', 'BAF', 'CNV',
];
const CARGO_CALLSIGN_PREFIXES = [
    'FDX', 'UPS', 'DHL', 'CKS', 'GTI', 'ABX', 'CLX', 'BOX', 'NCR', 'BCS', 'FX',
];
const MILITARY_TYPE_PREFIXES = [
    'C17', 'C130', 'KC', 'E3', 'P8', 'A400', 'C5', 'F15', 'F16', 'F18', 'B52', 'B1',
];
const CARGO_TYPE_HINTS = ['744F', '748F', '77F', '76F', '73F', 'A332F', 'A30F'];

function toRadians(value) {
    return value * Math.PI / 180;
}

function toDegrees(value) {
    return value * 180 / Math.PI;
}

function normalizeLongitude(lon) {
    let value = lon;
    while (value > 180) value -= 360;
    while (value < -180) value += 360;
    return value;
}

function normalizeCallsign(raw) {
    return String(raw || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '');
}

function classifyFlight({ callsign, operator, aircraftType, categoryCode }) {
    const normalizedCallsign = normalizeCallsign(callsign);
    const operatorText = String(operator || '').toUpperCase();
    const typeText = String(aircraftType || '').toUpperCase();

    const isMilitary =
        MILITARY_CALLSIGN_PREFIXES.some((prefix) => normalizedCallsign.startsWith(prefix)) ||
        MILITARY_TYPE_PREFIXES.some((prefix) => typeText.startsWith(prefix)) ||
        /(AIR FORCE|AIRFORCE|MILITARY|NAVY|ARMY|MARINES|DEFENCE|DEFENSE|USAF|RAF)/.test(operatorText);

    if (isMilitary) return 'military';

    const isCargo =
        CARGO_CALLSIGN_PREFIXES.some((prefix) => normalizedCallsign.startsWith(prefix)) ||
        CARGO_TYPE_HINTS.some((hint) => typeText.includes(hint)) ||
        /(CARGO|FREIGHT|EXPRESS|LOGISTICS|PARCEL)/.test(operatorText);

    if (isCargo) return 'cargo';

    const looksPassenger = /^[A-Z]{2,3}\d/.test(normalizedCallsign) ||
        /(AIRLINES|AIRWAYS|JET|AIR\s)/.test(operatorText);

    if (looksPassenger) return 'passenger';

    if (categoryCode === 'A1' || categoryCode === 'A2') return 'private';

    if (!normalizedCallsign && !operatorText) return 'unknown';

    return 'private';
}

function projectFlightPosition(longitude, latitude, headingDeg, speedMps, dtSeconds) {
    if (
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(headingDeg) ||
        !Number.isFinite(speedMps) ||
        speedMps <= 0
    ) {
        return { longitude, latitude };
    }

    const angularDistance = (speedMps * dtSeconds) / EARTH_RADIUS_M;
    const heading = toRadians(headingDeg);
    const lat1 = toRadians(latitude);
    const lon1 = toRadians(longitude);

    const sinLat1 = Math.sin(lat1);
    const cosLat1 = Math.cos(lat1);
    const sinAngular = Math.sin(angularDistance);
    const cosAngular = Math.cos(angularDistance);

    const lat2 = Math.asin(
        sinLat1 * cosAngular + cosLat1 * sinAngular * Math.cos(heading)
    );

    const lon2 = lon1 + Math.atan2(
        Math.sin(heading) * sinAngular * cosLat1,
        cosAngular - sinLat1 * Math.sin(lat2)
    );

    return {
        longitude: normalizeLongitude(toDegrees(lon2)),
        latitude: Math.max(-89.9, Math.min(89.9, toDegrees(lat2))),
    };
}

function parseOpenSkyPayload(payload) {
    try {
        let parsed = payload;
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        if (parsed && typeof parsed.contents === 'string') parsed = JSON.parse(parsed.contents);
        if (!parsed || !Array.isArray(parsed.states)) return [];

        return parsed.states
            .map((state) => {
                const [
                    icao24, callsign, origin_country, , ,
                    longitude, latitude, baro_altitude,
                    on_ground, velocity, true_track,
                ] = state;

                if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || on_ground === true) return null;

                const normalizedCallsign = callsign ? String(callsign).trim() : String(icao24 || 'UNKNOWN').toUpperCase();
                const operator = origin_country || 'Unknown';

                return {
                    id: String(icao24 || `${longitude}:${latitude}`).toLowerCase(),
                    callsign: normalizedCallsign,
                    operator,
                    origin: operator,
                    registration: 'N/A',
                    aircraftType: 'N/A',
                    categoryCode: 'N/A',
                    provider: 'OpenSky',
                    longitude,
                    latitude,
                    altitudeM: Number.isFinite(baro_altitude) ? baro_altitude : 10000,
                    velocityMps: Number.isFinite(velocity) ? velocity : 0,
                    headingDeg: Number.isFinite(true_track) ? true_track : 0,
                };
            })
            .filter(Boolean)
            .map((flight) => ({
                ...flight,
                flightClass: classifyFlight(flight),
            }));
    } catch (err) {
        return [];
    }
}

function parseAdsbPayload(payload, provider) {
    if (!payload || !Array.isArray(payload.ac)) return [];

    return payload.ac
        .map((ac) => {
            const longitude = typeof ac.lon === 'number' ? ac.lon : Number(ac.lon);
            const latitude = typeof ac.lat === 'number' ? ac.lat : Number(ac.lat);
            if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;

            const baroFeet = typeof ac.alt_baro === 'number' ? ac.alt_baro : null;
            const geomFeet = typeof ac.alt_geom === 'number' ? ac.alt_geom : null;
            const altitudeM = Number.isFinite(baroFeet)
                ? baroFeet * FEET_TO_METERS
                : Number.isFinite(geomFeet)
                    ? geomFeet * FEET_TO_METERS
                    : 10000;

            const onGround = ac.alt_baro === 'ground' || (Number.isFinite(geomFeet) && geomFeet < 120);
            if (onGround) return null;

            const speedKnots = typeof ac.gs === 'number' ? ac.gs : Number(ac.gs);
            const headingDeg = typeof ac.track === 'number' ? ac.track : Number(ac.track);
            const callsign = String(ac.flight || ac.hex || 'UNKNOWN').trim();
            const operator = ac.ownOp || ac.desc || 'Unknown';

            const parsedFlight = {
                id: String(ac.hex || `${longitude}:${latitude}`).toLowerCase(),
                callsign,
                operator,
                origin: operator,
                registration: ac.r || 'N/A',
                aircraftType: ac.t || ac.desc || 'N/A',
                categoryCode: ac.category || 'N/A',
                provider,
                longitude,
                latitude,
                altitudeM,
                velocityMps: Number.isFinite(speedKnots) ? speedKnots * KNOTS_TO_MPS : 0,
                headingDeg: Number.isFinite(headingDeg) ? headingDeg : 0,
            };

            return {
                ...parsedFlight,
                flightClass: classifyFlight(parsedFlight),
            };
        })
        .filter(Boolean);
}

async function fetchJsonWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            cache: 'no-store',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

function createPlaneIconDataUri() {
    const canvas = document.createElement('canvas');
    canvas.width = 28;
    canvas.height = 28;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.translate(14, 14);
    ctx.fillStyle = '#00b4ff';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(2.6, 2.4);
    ctx.lineTo(8.2, 6.5);
    ctx.lineTo(7.2, 8.1);
    ctx.lineTo(1.3, 5.6);
    ctx.lineTo(1.3, 10.5);
    ctx.lineTo(-1.3, 10.5);
    ctx.lineTo(-1.3, 5.6);
    ctx.lineTo(-7.2, 8.1);
    ctx.lineTo(-8.2, 6.5);
    ctx.lineTo(-2.6, 2.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    return canvas.toDataURL('image/png');
}

const AIRCRAFT_SOURCES = [
    { url: API_URLS.ADSB_ONE_GLOBAL, parser: (payload) => parseAdsbPayload(payload, 'ADSB.one') },
    { url: API_URLS.AIRPLANES_GLOBAL, parser: (payload) => parseAdsbPayload(payload, 'Airplanes.live') },
    // India-focused OpenSky window for stronger regional density.
    { url: API_URLS.OPENSKY_INDIA, parser: parseOpenSkyPayload },
    { url: API_URLS.OPENSKY_INDIA_PROXY, parser: parseOpenSkyPayload },
    // Try direct OpenSky first (works when browser/network permits CORS).
    { url: API_URLS.OPENSKY, parser: parseOpenSkyPayload },
    // Proxy fallback for browsers/networks where direct OpenSky CORS is blocked.
    { url: API_URLS.OPENSKY_PROXY, parser: parseOpenSkyPayload },
];

export default function AircraftLayer({ viewer }) {
    const aircraftEnabled = useStore((s) => s.layers.aircraft.enabled);
    const militaryActivityEnabled = useStore((s) => s.layers.militaryActivity.enabled);
    const flightFilters = useStore((s) => s.flightFilters);
    const trackedTarget = useStore((s) => s.trackedTarget);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);
    const setAircraftFeedData = useStore((s) => s.setAircraftFeedData);

    const entitiesRef = useRef(new Map());
    const flightStateRef = useRef(new Map());
    const rawFlightsRef = useRef([]);
    const pollTimerRef = useRef(null);
    const animationTimerRef = useRef(null);
    const mountedRef = useRef(true);
    const planeIconRef = useRef(null);
    const shouldIngest = aircraftEnabled || militaryActivityEnabled;

    const clearEntities = useCallback(() => {
        entitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
        entitiesRef.current.clear();
        flightStateRef.current.clear();
    }, [viewer]);

    const applyTrackedVisibility = useCallback((trackedEntityId) => {
        const hasTrackedAircraft = Boolean(
            trackedEntityId &&
            typeof trackedEntityId === 'string' &&
            trackedEntityId.startsWith('aircraft-')
        );

        for (const [, entity] of entitiesRef.current.entries()) {
            entity.show = hasTrackedAircraft ? entity.id === trackedEntityId : true;
        }

        if (viewer && !viewer.isDestroyed()) {
            viewer.scene.requestRender();
        }
    }, [viewer]);

    const animateFlights = useCallback(() => {
        if (!viewer || viewer.isDestroyed()) return;

        const nowMs = Date.now();
        for (const [id, flight] of flightStateRef.current.entries()) {
            const entity = entitiesRef.current.get(id);
            if (!entity) continue;

            const elapsedSeconds = Math.min(
                Math.max((nowMs - flight.updatedAtMs) / 1000, 0),
                MAX_EXTRAPOLATION_SECONDS
            );

            const projected = projectFlightPosition(
                flight.longitude,
                flight.latitude,
                flight.headingDeg,
                flight.velocityMps,
                elapsedSeconds
            );

            entity.position = Cesium.Cartesian3.fromDegrees(
                projected.longitude,
                projected.latitude,
                flight.altitudeM
            );
        }

        viewer.scene.requestRender();
    }, [viewer]);

    const handleData = useCallback((flights) => {
        if (!Array.isArray(flights) || !flights.length) {
            clearEntities();
            updateData('aircraft', []);
            setStatus('aircraft', 'error');
            return;
        }

        const activeFilters = useStore.getState().flightFilters;
        const activeTrackedTarget = useStore.getState().trackedTarget;
        const trackedEntityId = (
            activeTrackedTarget?.type === 'aircraft' &&
            typeof activeTrackedTarget.entityId === 'string' &&
            activeTrackedTarget.entityId.startsWith('aircraft-')
        )
            ? activeTrackedTarget.entityId
            : null;
        const airlineQuery = String(activeFilters.airlineQuery || '').trim().toUpperCase();
        const visibleFlights = flights.filter((flight) => {
            if (!activeFilters[flight.flightClass]) return false;
            if (!airlineQuery) return true;
            return (
                String(flight.callsign || '').toUpperCase().includes(airlineQuery) ||
                String(flight.operator || '').toUpperCase().includes(airlineQuery) ||
                String(flight.registration || '').toUpperCase().includes(airlineQuery)
            );
        });

        setStatus('aircraft', 'active');
        updateData('aircraft', visibleFlights);

        const currentIds = new Set();
        const nowMs = Date.now();

        visibleFlights.forEach((flight) => {
            const id = flight.id;
            currentIds.add(id);

            flightStateRef.current.set(id, {
                ...flight,
                updatedAtMs: nowMs,
            });

            const speedKmh = flight.velocityMps ? Math.round(flight.velocityMps * 3.6) : null;
            const heading = Number.isFinite(flight.headingDeg) ? Math.round(flight.headingDeg) : null;
            const rotation = Cesium.Math.toRadians(heading || 0);

            if (entitiesRef.current.has(id)) {
                const entity = entitiesRef.current.get(id);
                entity.position = Cesium.Cartesian3.fromDegrees(flight.longitude, flight.latitude, flight.altitudeM);
                entity.billboard.rotation = rotation;
                entity.show = trackedEntityId ? entity.id === trackedEntityId : true;
                entity.properties.callsign = flight.callsign;
                entity.properties.operator = flight.operator;
                entity.properties.provider = flight.provider;
                entity.properties.class = flight.flightClass.toUpperCase();
                entity.properties.aircraftType = flight.aircraftType;
                entity.properties.registration = flight.registration;
                entity.properties.latitude = flight.latitude.toFixed(4);
                entity.properties.longitude = flight.longitude.toFixed(4);
                entity.properties.altitude = `${Math.round(flight.altitudeM)} m`;
                entity.properties.velocity = speedKmh !== null ? `${speedKmh} km/h` : 'N/A';
                entity.properties.heading = heading !== null ? `${heading}°` : 'N/A';
                entity.properties._headingDeg = heading !== null ? heading : 0;
            } else {
                const entity = viewer.entities.add({
                    id: `aircraft-${id}`,
                    position: Cesium.Cartesian3.fromDegrees(flight.longitude, flight.latitude, flight.altitudeM),
                    show: trackedEntityId ? `aircraft-${id}` === trackedEntityId : true,
                    name: flight.callsign,
                    billboard: {
                        image: planeIconRef.current,
                        scale: 0.48,
                        alignedAxis: Cesium.Cartesian3.UNIT_Z,
                        rotation,
                        disableDepthTestDistance: 9000000,
                    },
                    properties: {
                        _layerType: 'aircraft',
                        callsign: flight.callsign,
                        operator: flight.operator,
                        provider: flight.provider,
                        class: flight.flightClass.toUpperCase(),
                        icao24: id,
                        registration: flight.registration,
                        aircraftType: flight.aircraftType,
                        altitude: `${Math.round(flight.altitudeM)} m`,
                        velocity: speedKmh !== null ? `${speedKmh} km/h` : 'N/A',
                        heading: heading !== null ? `${heading}°` : 'N/A',
                        _headingDeg: heading !== null ? heading : 0,
                        latitude: flight.latitude.toFixed(4),
                        longitude: flight.longitude.toFixed(4),
                        status: 'AIRBORNE',
                    },
                });
                entitiesRef.current.set(id, entity);
            }
        });

        for (const [id, entity] of entitiesRef.current.entries()) {
            if (!currentIds.has(id)) {
                viewer.entities.remove(entity);
                entitiesRef.current.delete(id);
                flightStateRef.current.delete(id);
            }
        }
    }, [clearEntities, setStatus, updateData, viewer]);

    const pollAircraft = useCallback(async () => {
        if (!shouldIngest || !mountedRef.current) return;

        const results = await Promise.allSettled(
            AIRCRAFT_SOURCES.map(async (source) => {
                const payload = await fetchJsonWithTimeout(source.url, REQUEST_TIMEOUT_MS);
                return source.parser(payload);
            })
        );

        const merged = new Map();
        for (const result of results) {
            if (result.status !== 'fulfilled') continue;
            for (const flight of result.value) {
                if (!flight || !flight.id) continue;
                const existing = merged.get(flight.id);
                if (!existing) {
                    merged.set(flight.id, flight);
                    continue;
                }

                // Prefer records with richer metadata.
                const existingScore =
                    (existing.operator && existing.operator !== 'Unknown' ? 1 : 0) +
                    (existing.registration && existing.registration !== 'N/A' ? 1 : 0) +
                    (existing.aircraftType && existing.aircraftType !== 'N/A' ? 1 : 0);
                const newScore =
                    (flight.operator && flight.operator !== 'Unknown' ? 1 : 0) +
                    (flight.registration && flight.registration !== 'N/A' ? 1 : 0) +
                    (flight.aircraftType && flight.aircraftType !== 'N/A' ? 1 : 0);

                if (newScore >= existingScore) {
                    merged.set(flight.id, flight);
                }
            }
        }

        const flights = Array.from(merged.values());
        rawFlightsRef.current = flights;
        setAircraftFeedData(flights);

        if (!flights.length) {
            clearEntities();
            if (aircraftEnabled) {
                updateData('aircraft', []);
                setStatus('aircraft', 'error');
            } else {
                updateData('aircraft', []);
                setStatus('aircraft', 'idle');
            }
            return;
        }

        if (aircraftEnabled) {
            handleData(flights);
        } else {
            // Keep ingesting raw feed for military layer while aircraft visuals stay hidden.
            clearEntities();
            updateData('aircraft', []);
            setStatus('aircraft', 'idle');
        }
    }, [
        aircraftEnabled,
        clearEntities,
        handleData,
        setAircraftFeedData,
        setStatus,
        shouldIngest,
        updateData,
    ]);

    useEffect(() => {
        if (!planeIconRef.current) {
            planeIconRef.current = createPlaneIconDataUri();
        }
    }, []);

    useEffect(() => {
        if (!aircraftEnabled) return;
        if (!rawFlightsRef.current.length) return;
        handleData(rawFlightsRef.current);
    }, [flightFilters, handleData, aircraftEnabled]);

    useEffect(() => {
        if (!aircraftEnabled) return;
        const trackedEntityId = (
            trackedTarget?.type === 'aircraft' &&
            typeof trackedTarget.entityId === 'string' &&
            trackedTarget.entityId.startsWith('aircraft-')
        )
            ? trackedTarget.entityId
            : null;
        applyTrackedVisibility(trackedEntityId);
    }, [trackedTarget, applyTrackedVisibility, aircraftEnabled]);

    useEffect(() => {
        mountedRef.current = true;

        if (!shouldIngest) {
            clearInterval(pollTimerRef.current);
            clearInterval(animationTimerRef.current);
            clearEntities();
            updateData('aircraft', []);
            setStatus('aircraft', 'idle');
            setAircraftFeedData([]);
            return;
        }

        if (aircraftEnabled) {
            setStatus('aircraft', 'loading');
        } else {
            setStatus('aircraft', 'idle');
            clearEntities();
            updateData('aircraft', []);
        }
        pollAircraft();
        pollTimerRef.current = setInterval(pollAircraft, POLL_INTERVALS.AIRCRAFT);
        if (aircraftEnabled) {
            animationTimerRef.current = setInterval(animateFlights, ANIMATION_INTERVAL_MS);
        }

        return () => {
            mountedRef.current = false;
            clearInterval(pollTimerRef.current);
            clearInterval(animationTimerRef.current);
            if (viewer && !viewer.isDestroyed()) {
                clearEntities();
            }
        };
    }, [
        aircraftEnabled,
        animateFlights,
        clearEntities,
        pollAircraft,
        setAircraftFeedData,
        setStatus,
        shouldIngest,
        updateData,
        viewer,
    ]);

    return null;
}
