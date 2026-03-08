import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import * as satellite from 'satellite.js';
import useStore from '../store/useStore';
import { useTextFetcher } from '../hooks/useDataFetcher';
import { API_URLS, POLL_INTERVALS } from '../constants/dataSources';

const FALLBACK_TLE = `ISS (ZARYA)
1 25544U 98067A   24068.31846065  .00017169  00000+0  31416-3 0  9997
2 25544  51.6406   9.2062 0005705  72.1866  33.9189 15.49883492443026
HST
1 20580U 90037B   24068.27218384  .00003290  00000+0  16259-3 0  9991
2 20580  28.4694 207.2185 0002448  91.1354  30.8351 15.00052309489568
NOAA 19
1 33591U 09005A   24068.45524317  .00000114  00000+0  10065-3 0  9997
2 33591  99.1672  46.8524 0014282 259.9571  99.9880 14.12871373778526
STARLINK-1007
1 44713U 19074A   24068.41666667  .00000000  00000+0  00000+0 0  9990
2 44713  53.0500  10.0000 0001000   0.0000   0.0000 15.06000000000000`;

export default function SatelliteLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.satellites.enabled);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);

    const entitiesRef = useRef(new Map());
    const satRecordsRef = useRef([]);
    const updateTimerRef = useRef(null);

    // Cleanup
    useEffect(() => {
        if (!isEnabled) {
            clearInterval(updateTimerRef.current);
            entitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
            entitiesRef.current.clear();
            satRecordsRef.current = [];
            setStatus('satellites', 'idle');
        }
        return () => {
            clearInterval(updateTimerRef.current);
            if (viewer && !viewer.isDestroyed()) {
                entitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
            }
            entitiesRef.current.clear();
        };
    }, [isEnabled, viewer, setStatus]);

    // Parse TLE text data
    const handleTLEData = (tleText) => {
        setStatus('satellites', 'active');

        // Parse TLE pairs
        const lines = tleText.split('\n').filter(l => l.trim().length > 0);
        const records = [];

        for (let i = 0; i < lines.length; i += 3) {
            if (i + 2 >= lines.length) break;
            const name = lines[i].trim();
            const tleLine1 = lines[i + 1].trim();
            const tleLine2 = lines[i + 2].trim();

            try {
                const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
                records.push({ name, satrec });
            } catch (err) {
                // Skip invalid records
            }
        }

        satRecordsRef.current = records;
        updateData('satellites', records);
        updateSatellitePositions();

        // Start local propagation loop
        clearInterval(updateTimerRef.current);
        updateTimerRef.current = setInterval(updateSatellitePositions, POLL_INTERVALS.SATELLITES);
    };

    const updateSatellitePositions = () => {
        if (!satRecordsRef.current.length || !viewer || viewer.isDestroyed()) return;

        const now = new Date();
        const currentIds = new Set();

        // To preserve performance, only render a subset (e.g. 1500 max)
        const activeRecords = satRecordsRef.current.slice(0, 1500);

        activeRecords.forEach(({ name, satrec }, idx) => {
            const id = `sat-${satrec.satnum}-${idx}`;
            currentIds.add(id);

            // Propagate position using satellite.js
            const positionAndVelocity = satellite.propagate(satrec, now);
            const posEci = positionAndVelocity.position;

            if (!posEci || typeof posEci === 'boolean') return;

            const gmst = satellite.gstime(now);
            const posGd = satellite.eciToGeodetic(posEci, gmst);

            const longitude = satellite.degreesLong(posGd.longitude);
            const latitude = satellite.degreesLat(posGd.latitude);
            const height = posGd.height * 1000; // km to meters

            if (isNaN(longitude) || isNaN(latitude) || isNaN(height)) return;

            const position = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);

            // Velocity in km/s -> km/h
            const velEci = positionAndVelocity.velocity;
            const velocityKmh = velEci
                ? Math.round(Math.sqrt(velEci.x * velEci.x + velEci.y * velEci.y + velEci.z * velEci.z) * 3600)
                : 'Unknown';

            if (entitiesRef.current.has(id)) {
                // Update
                const entity = entitiesRef.current.get(id);
                entity.position = position;
                entity.properties.latitude = latitude.toFixed(4);
                entity.properties.longitude = longitude.toFixed(4);
                entity.properties.altitude = `${Math.round(posGd.height)} km`;
            } else {
                // Create
                const SAT_SVG = '<svg width="12" height="12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffaa00" stroke="#ffffff" stroke-width="0.5"><path d="M22.08 7.21l-5.3-5.3c-.39-.39-1.02-.39-1.41 0l-1.42 1.42 6.71 6.71 1.42-1.42c.39-.39.39-1.02 0-1.41zM3.46 17.96l6.71 6.71 1.42-1.42c.39-.39.39-1.02 0-1.41l-5.3-5.3c-.39-.39-1.02-.39-1.41 0l-1.42 1.42m10.74-6.32l-6.11 6.1c-.39.39-1.02.39-1.41 0l-2.83-2.83c-.39-.39-.39-1.02 0-1.41l6.11-6.1c.36-.36.86-.44 1.3-.23.69.32 1.41.6 2.18.79.46.12.82.52.88 1 .2.76.47 1.49.8 2.18.2.43.12.92-.23 1.28L14.2 11.64zM2.83 23.36l2.12-2.12-1.41-1.41-2.12 2.12 1.41 1.41z"/></svg>';
                const SAT_IMG = 'data:image/svg+xml;base64,' + btoa(SAT_SVG);

                const entity = viewer.entities.add({
                    id: id,
                    position: position,
                    name: name,
                    billboard: {
                        image: SAT_IMG,
                        scale: 1.0,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY, // Show through earth occasionally for orbital feel
                    },
                    properties: {
                        _layerType: 'satellites',
                        designator: satrec.satnum,
                        altitude: `${Math.round(posGd.height)} km`,
                        velocity: `${velocityKmh} km/h`,
                        inclination: `${(satrec.inclo * 180 / Math.PI).toFixed(2)}°`,
                        status: 'ORBIT TACKING',
                    },
                });
                entitiesRef.current.set(id, entity);
            }
        });

        // Remove old ones
        for (const [id, entity] of entitiesRef.current.entries()) {
            if (!currentIds.has(id)) {
                viewer.entities.remove(entity);
                entitiesRef.current.delete(id);
            }
        }
    };

    const handleError = () => {
        // Celestrak often rate limits or CORS blocks. Provide a reliable fallback.
        setStatus('satellites', 'active');
        handleTLEData(FALLBACK_TLE);
    };

    useTextFetcher(
        API_URLS.CELESTRAK_ACTIVE,
        isEnabled,
        handleTLEData,
        handleError
    );

    useEffect(() => {
        if (isEnabled && satRecordsRef.current.length === 0) {
            setStatus('satellites', 'loading');
        }
    }, [isEnabled, setStatus]);

    return null;
}
