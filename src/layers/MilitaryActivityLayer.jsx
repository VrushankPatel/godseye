import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';

function createMilitaryFlightIconDataUri() {
    const canvas = document.createElement('canvas');
    canvas.width = 28;
    canvas.height = 28;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.translate(14, 14);
    ctx.fillStyle = '#ff5b5b';
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
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

    ctx.strokeStyle = 'rgba(255, 91, 91, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.stroke();

    return canvas.toDataURL('image/png');
}

function getRotationFromHeading(heading) {
    return Cesium.Math.toRadians(Number.isFinite(heading) ? heading : 0);
}

export default function MilitaryActivityLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.militaryActivity.enabled);
    const aircraftEnabled = useStore((s) => s.layers.aircraft.enabled);
    const aircraftStatus = useStore((s) => s.layers.aircraft.status);
    const aircraftData = useStore((s) => s.layers.aircraft.data);
    const toggleLayer = useStore((s) => s.toggleLayer);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);

    const entitiesRef = useRef(new Map());
    const iconRef = useRef(null);

    const clearLayer = useCallback(() => {
        entitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
        entitiesRef.current.clear();
    }, [viewer]);

    useEffect(() => {
        if (!iconRef.current) {
            iconRef.current = createMilitaryFlightIconDataUri();
        }
    }, []);

    useEffect(() => {
        if (!isEnabled) return;
        if (aircraftEnabled) return;

        // Military activity relies on live ADS-B data from the aircraft ingest pipeline.
        toggleLayer('aircraft');
    }, [isEnabled, aircraftEnabled, toggleLayer]);

    useEffect(() => {
        if (!isEnabled) {
            clearLayer();
            updateData('militaryActivity', []);
            setStatus('militaryActivity', 'idle');
            return;
        }

        if (!aircraftEnabled || aircraftStatus === 'loading') {
            setStatus('militaryActivity', 'loading');
            return;
        }

        const militaryFlights = (Array.isArray(aircraftData) ? aircraftData : [])
            .filter((flight) => String(flight.flightClass || '').toLowerCase() === 'military');

        const currentIds = new Set();
        militaryFlights.forEach((flight) => {
            if (!Number.isFinite(flight.longitude) || !Number.isFinite(flight.latitude)) return;

            const id = `mil-act-${flight.id}`;
            currentIds.add(id);
            const heading = Number.isFinite(flight.headingDeg) ? Math.round(flight.headingDeg) : 0;
            const speedKmh = Number.isFinite(flight.velocityMps) ? Math.round(flight.velocityMps * 3.6) : null;
            const position = Cesium.Cartesian3.fromDegrees(flight.longitude, flight.latitude, flight.altitudeM || 0);

            if (entitiesRef.current.has(id)) {
                const entity = entitiesRef.current.get(id);
                entity.position = position;
                entity.billboard.rotation = getRotationFromHeading(heading);
                entity.properties.heading = `${heading}°`;
                entity.properties.velocity = speedKmh !== null ? `${speedKmh} km/h` : 'N/A';
                entity.properties.altitude = `${Math.round(flight.altitudeM || 0)} m`;
                entity.properties.latitude = flight.latitude.toFixed(4);
                entity.properties.longitude = flight.longitude.toFixed(4);
                return;
            }

            const entity = viewer.entities.add({
                id,
                position,
                name: flight.callsign || `MIL-${flight.id}`,
                billboard: {
                    image: iconRef.current,
                    scale: 0.58,
                    alignedAxis: Cesium.Cartesian3.UNIT_Z,
                    rotation: getRotationFromHeading(heading),
                    disableDepthTestDistance: 9000000,
                },
                properties: {
                    _layerType: 'militaryActivity',
                    callsign: flight.callsign || 'UNKNOWN',
                    operator: flight.operator || 'Unknown',
                    provider: flight.provider || 'ADS-B',
                    class: 'MILITARY',
                    aircraftType: flight.aircraftType || 'N/A',
                    registration: flight.registration || 'N/A',
                    altitude: `${Math.round(flight.altitudeM || 0)} m`,
                    velocity: speedKmh !== null ? `${speedKmh} km/h` : 'N/A',
                    heading: `${heading}°`,
                    _headingDeg: heading,
                    latitude: flight.latitude.toFixed(4),
                    longitude: flight.longitude.toFixed(4),
                    status: 'MIL ACTIVITY',
                },
            });

            entitiesRef.current.set(id, entity);
        });

        for (const [id, entity] of entitiesRef.current.entries()) {
            if (!currentIds.has(id)) {
                viewer.entities.remove(entity);
                entitiesRef.current.delete(id);
            }
        }

        updateData('militaryActivity', militaryFlights);
        if (!militaryFlights.length && aircraftStatus === 'error') {
            setStatus('militaryActivity', 'error');
        } else {
            setStatus('militaryActivity', 'active');
        }
        viewer.scene.requestRender();
    }, [
        isEnabled,
        aircraftEnabled,
        aircraftStatus,
        aircraftData,
        clearLayer,
        setStatus,
        updateData,
        viewer,
    ]);

    return null;
}
