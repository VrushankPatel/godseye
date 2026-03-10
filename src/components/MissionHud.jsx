import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { LAYER_DEFS, SURVEILLANCE_PRIMARY_LAYERS } from '../constants/dataSources';

// ── Full city database for dynamic shortcuts ──
const ALL_CITIES = [
    { name: 'London', longitude: -0.1276, latitude: 51.5072, height: 180000, pitch: -65 },
    { name: 'New York', longitude: -74.006, latitude: 40.7128, height: 220000 },
    { name: 'Tokyo', longitude: 139.6917, latitude: 35.6895, height: 220000 },
    { name: 'Dubai', longitude: 55.2708, latitude: 25.2048, height: 220000 },
    { name: 'Sydney', longitude: 151.2093, latitude: -33.8688, height: 260000 },
    { name: 'Paris', longitude: 2.3522, latitude: 48.8566, height: 180000 },
    { name: 'Berlin', longitude: 13.4050, latitude: 52.5200, height: 200000 },
    { name: 'Moscow', longitude: 37.6173, latitude: 55.7558, height: 220000 },
    { name: 'Beijing', longitude: 116.4074, latitude: 39.9042, height: 220000 },
    { name: 'Shanghai', longitude: 121.4737, latitude: 31.2304, height: 200000 },
    { name: 'Mumbai', longitude: 72.8777, latitude: 19.0760, height: 180000 },
    { name: 'Delhi', longitude: 77.2090, latitude: 28.6139, height: 200000 },
    { name: 'Seoul', longitude: 126.9780, latitude: 37.5665, height: 200000 },
    { name: 'Singapore', longitude: 103.8198, latitude: 1.3521, height: 160000 },
    { name: 'Bangkok', longitude: 100.5018, latitude: 13.7563, height: 180000 },
    { name: 'Istanbul', longitude: 28.9784, latitude: 41.0082, height: 200000 },
    { name: 'Cairo', longitude: 31.2357, latitude: 30.0444, height: 200000 },
    { name: 'Lagos', longitude: 3.3792, latitude: 6.5244, height: 180000 },
    { name: 'Nairobi', longitude: 36.8219, latitude: -1.2921, height: 180000 },
    { name: 'Cape Town', longitude: 18.4241, latitude: -33.9249, height: 200000 },
    { name: 'São Paulo', longitude: -46.6333, latitude: -23.5505, height: 220000 },
    { name: 'Buenos Aires', longitude: -58.3816, latitude: -34.6037, height: 220000 },
    { name: 'Los Angeles', longitude: -118.2437, latitude: 34.0522, height: 200000 },
    { name: 'Chicago', longitude: -87.6298, latitude: 41.8781, height: 200000 },
    { name: 'Toronto', longitude: -79.3832, latitude: 43.6532, height: 200000 },
    { name: 'Mexico City', longitude: -99.1332, latitude: 19.4326, height: 200000 },
    { name: 'Lima', longitude: -77.0428, latitude: -12.0464, height: 200000 },
    { name: 'Jakarta', longitude: 106.8456, latitude: -6.2088, height: 200000 },
    { name: 'Manila', longitude: 120.9842, latitude: 14.5995, height: 180000 },
    { name: 'Taipei', longitude: 121.5654, latitude: 25.0330, height: 180000 },
    { name: 'Hong Kong', longitude: 114.1694, latitude: 22.3193, height: 160000 },
    { name: 'Riyadh', longitude: 46.6753, latitude: 24.7136, height: 200000 },
    { name: 'Tehran', longitude: 51.3890, latitude: 35.6892, height: 200000 },
    { name: 'Johannesburg', longitude: 28.0473, latitude: -26.2041, height: 200000 },
    { name: 'Rome', longitude: 12.4964, latitude: 41.9028, height: 180000 },
    { name: 'Madrid', longitude: -3.7038, latitude: 40.4168, height: 180000 },
    { name: 'Amsterdam', longitude: 4.9041, latitude: 52.3676, height: 160000 },
    { name: 'Stockholm', longitude: 18.0686, latitude: 59.3293, height: 180000 },
    { name: 'Bogotá', longitude: -74.0721, latitude: 4.7110, height: 200000 },
    { name: 'Melbourne', longitude: 144.9631, latitude: -37.8136, height: 220000 },
];

// Cartesian positions pre-computed once for perf
const CITY_CARTESIANS = ALL_CITIES.map((c) => ({
    ...c,
    cartesian: Cesium.Cartesian3.fromDegrees(c.longitude, c.latitude),
}));

function getVisibleCities(viewer, maxCities = 6) {
    if (!viewer || viewer.isDestroyed()) return ALL_CITIES.slice(0, maxCities);

    const camera = viewer.camera;
    const cameraPos = camera.positionWC;

    // Get the point the camera is looking at (center of screen)
    const centerRay = camera.getPickRay(new Cesium.Cartesian2(
        viewer.canvas.width / 2,
        viewer.canvas.height / 2,
    ));

    let lookAtCartesian = null;
    if (centerRay) {
        const hit = viewer.scene.globe.pick(centerRay, viewer.scene);
        if (hit) lookAtCartesian = hit;
    }

    // Fallback: use camera position projected to surface
    if (!lookAtCartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cameraPos);
        lookAtCartesian = Cesium.Cartesian3.fromRadians(
            cartographic.longitude,
            cartographic.latitude,
            0,
        );
    }

    // Score cities: closer to camera look-at center = better
    const scored = CITY_CARTESIANS.map((city) => {
        const dist = Cesium.Cartesian3.distance(lookAtCartesian, city.cartesian);
        return { city, dist };
    });

    scored.sort((a, b) => a.dist - b.dist);
    return scored.slice(0, maxCities).map((s) => s.city);
}

export default function MissionHud() {
    const layers = useStore((s) => s.layers);
    const viewerRef = useStore((s) => s.viewerRef);
    const activeShader = useStore((s) => s.activeShader);
    const inspector = useStore((s) => s.inspector);
    const layerPanelOpen = useStore((s) => s.layerPanelOpen);

    const [visibleCities, setVisibleCities] = useState(ALL_CITIES.slice(0, 6));
    const rafRef = useRef(null);

    const LAYER_SCALE = {
        aircraft: 10000,
        satellites: 12000,
        seismic: 600,
        airports: 10000,
        seismicStations: 5000,
        maritime: 8000,
        powerGrid: 7000,
        cctv: 8000,
        traffic: 1200,
        conflicts: 1200,
        militaryActivity: 1000,
        militaryBases: 3000,
        forbiddenZones: 1500,
        airspace: 1500,
    };

    // Dynamic city updates on camera movement
    useEffect(() => {
        if (!viewerRef || viewerRef.isDestroyed()) return;

        const updateCities = () => {
            const cities = getVisibleCities(viewerRef, 6);
            setVisibleCities(cities);
        };

        // Initial
        updateCities();

        // On camera move end
        const removeListener = viewerRef.camera.moveEnd.addEventListener(() => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(updateCities);
        });

        return () => {
            removeListener();
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [viewerRef]);

    const metrics = SURVEILLANCE_PRIMARY_LAYERS
        .map((key) => {
            const layer = layers[key];
            const def = LAYER_DEFS[key];
            if (!layer || !def) return null;
            if (!layer.enabled || layer.status !== 'active') return null;

            const scale = LAYER_SCALE[key] || 1000;
            const pct = Math.max(8, Math.min(100, Math.round((layer.count / scale) * 100)));
            return {
                key,
                label: def.label,
                value: layer.count,
                pct,
                color: def.color || '#00b4ff',
            };
        })
        .filter(Boolean);

    const focusCity = useCallback((city) => {
        if (!viewerRef || viewerRef.isDestroyed()) return;
        viewerRef.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(city.longitude, city.latitude, city.height),
            orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(city.pitch ?? -65),
                roll: 0,
            },
            duration: 1.8,
        });
    }, [viewerRef]);

    return (
        <>
            <div
                className={`mission-hud-left glass-panel pointer-events-none z-10 ${layerPanelOpen ? 'mission-hud-left--offset' : ''
                    }`}
            >
                <div className="mission-label">CLASSIFIED // EYES ONLY // GODSEYE</div>
                <div className="mission-title">{activeShader} MODE</div>
                <div className="mission-sub">SURVEILLANCE NODE ACTIVE</div>
            </div>

            {metrics.length > 0 && (
                <div
                    className={`mission-hud-right pointer-events-auto z-10 ${inspector ? 'mission-hud-right--offset' : ''
                        }`}
                >
                    {metrics.map((metric) => (
                        <div key={metric.key} className="mission-metric">
                            <div className="mission-metric-top">
                                <span>{metric.label}</span>
                                <span>{metric.value.toLocaleString()}</span>
                            </div>
                            <div className="mission-bar">
                                <div
                                    className="mission-bar-fill"
                                    style={{
                                        width: `${metric.pct}%`,
                                        background: metric.color,
                                        boxShadow: `0 0 10px ${metric.color}66`,
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mission-cities pointer-events-auto z-10">
                <button className="city-chip" onClick={() => focusCity({ longitude: 10, latitude: 20, height: 9000000, pitch: -90 })}>
                    Global
                </button>
                {visibleCities.map((city) => (
                    <button key={city.name} className="city-chip" onClick={() => focusCity(city)}>
                        {city.name}
                    </button>
                ))}
            </div>
        </>
    );
}
