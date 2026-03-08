import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { useDataFetcher } from '../hooks/useDataFetcher';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

// Generate dynamic mock flights that actually move over time if the real API fails
const getMockFlights = () => {
    const timeOffset = Date.now() / 1000;
    const mockStates = [];

    // Create 150 mock flights spreading across the globe
    for (let i = 0; i < 150; i++) {
        const id = `mock-${i}`;
        const callsign = `MOC${i.toString().padStart(3, '0')}`;

        // Base starting positions
        const startLat = (i * 137.5) % 150 - 75; // stay away from poles
        const startLon = (i * 222.5) % 360 - 180;

        // Constant speed
        const speedKmh = 700 + (i % 300);
        const speedDegSec = speedKmh / 111139; // approx degrees per sec

        // Heading
        const heading = (i * 67) % 360;
        const headingRad = heading * Math.PI / 180;

        // Calculate current position based on time elapsed
        let lat = startLat + Math.cos(headingRad) * speedDegSec * timeOffset;
        let lon = startLon + Math.sin(headingRad) * speedDegSec * timeOffset;

        // Wrap around logic
        lon = ((lon + 180) % 360 + 360) % 360 - 180;
        if (lat > 90) lat = 180 - lat;
        if (lat < -90) lat = -180 - lat;

        mockStates.push([
            id, callsign, 'Simulated', null, null, lon, lat, 10000 + (i * 50), false, speedKmh / 3.6, heading
        ]);
    }
    return { states: mockStates };
};

export default function AircraftLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.aircraft.enabled);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);
    const entitiesRef = useRef(new Map());

    // Cleanup on unmount or disable
    useEffect(() => {
        if (!isEnabled) {
            entitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
            entitiesRef.current.clear();
            setStatus('aircraft', 'idle');
        }
        return () => {
            if (viewer && !viewer.isDestroyed()) {
                entitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
            }
            entitiesRef.current.clear();
        };
    }, [isEnabled, viewer, setStatus]);

    // Handle incoming OpenSky data
    const handleData = (data) => {
        if (!data || !data.states) {
            if (entitiesRef.current.size === 0) setStatus('aircraft', 'error');
            return;
        }

        setStatus('aircraft', 'active');
        updateData('aircraft', data.states);

        const currentTime = Cesium.JulianDate.now();
        const currentFrameIds = new Set();

        // Process top 1000 flights to keep performance smooth
        const flights = data.states.slice(0, 1000);

        flights.forEach((state) => {
            const [
                icao24, callsign, origin_country, time_position,
                last_contact, longitude, latitude, baro_altitude,
                on_ground, velocity, true_track
            ] = state;

            if (longitude === null || latitude === null || on_ground) return;

            currentFrameIds.add(icao24);
            const height = baro_altitude !== null ? baro_altitude : 10000;

            // Cleaned up callsign
            const cleanlyCallsign = callsign ? callsign.trim() : 'UNKNOWN';

            const position = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);

            if (entitiesRef.current.has(icao24)) {
                // Update existing entity smoothly
                const entity = entitiesRef.current.get(icao24);
                entity.position = position;

                // Update properties
                entity.properties.latitude = latitude.toFixed(4);
                entity.properties.longitude = longitude.toFixed(4);
                entity.properties.altitude = `${Math.round(height)} m`;
                entity.properties.velocity = `${Math.round(velocity * 3.6)} km/h`;
                entity.properties.heading = `${Math.round(true_track)}°`;
            } else {
                // Create new entity
                const AIRCRAFT_SVG = '<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#00b4ff" stroke="#ffffff" stroke-width="0.5"><path d="M21 16v-2l-8-5V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>';
                const AIRCRAFT_IMG = 'data:image/svg+xml;base64,' + btoa(AIRCRAFT_SVG);

                const entity = viewer.entities.add({
                    id: `aircraft-${icao24}`,
                    position: position,
                    name: cleanlyCallsign,
                    billboard: {
                        image: AIRCRAFT_IMG,
                        scale: 0.8,
                        rotation: Cesium.Math.toRadians(-true_track), // SVG points North by default, orient to heading
                        alignedAxis: Cesium.Cartesian3.UNIT_Z,
                        disableDepthTestDistance: 5000000,
                    },
                    properties: {
                        _layerType: 'aircraft',
                        callsign: cleanlyCallsign,
                        icao24: icao24,
                        origin: origin_country,
                        altitude: `${Math.round(height)} m`,
                        velocity: `${Math.round(velocity * 3.6)} km/h`,
                        heading: `${Math.round(true_track)}°`,
                        status: 'AIRBORNE',
                    },
                });

                entitiesRef.current.set(icao24, entity);
            }
        });

        // Remove stale entities that didn't appear in this update
        for (const [id, entity] of entitiesRef.current.entries()) {
            if (!currentFrameIds.has(id)) {
                viewer.entities.remove(entity);
                entitiesRef.current.delete(id);
            }
        }
    };

    const handleError = () => {
        // OpenSky often blocks browser requests due to CORS or rate limits
        // Fallback to dynamic simulated aircraft so the UI keeps working
        setStatus('aircraft', 'active');
        handleData(getMockFlights());
    };

    // Poll OpenSky
    // Using the proxy URL since OpenSky strict CORS blocks browser access
    useDataFetcher(
        API_URLS.OPENSKY_PROXY,
        POLL_INTERVALS.AIRCRAFT,
        isEnabled,
        (data) => {
            // The proxy wraps the real JSON as a string in `contents`
            if (data && data.contents) {
                try {
                    const parsed = JSON.parse(data.contents);
                    handleData(parsed);
                } catch (e) {
                    handleError();
                }
            } else {
                handleData(data); // If we somehow used direct URL
            }
        },
        handleError
    );

    useEffect(() => {
        if (isEnabled && entitiesRef.current.size === 0) {
            setStatus('aircraft', 'loading');
        }
    }, [isEnabled, setStatus]);

    return null;
}
