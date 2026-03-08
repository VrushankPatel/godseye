import React from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { LAYER_DEFS, SURVEILLANCE_PRIMARY_LAYERS } from '../constants/dataSources';

const CITY_PRESETS = [
    { name: 'London', longitude: -0.1276, latitude: 51.5072, height: 180000 },
    { name: 'New York', longitude: -74.006, latitude: 40.7128, height: 220000 },
    { name: 'Tokyo', longitude: 139.6917, latitude: 35.6895, height: 220000 },
    { name: 'Dubai', longitude: 55.2708, latitude: 25.2048, height: 220000 },
    { name: 'Sydney', longitude: 151.2093, latitude: -33.8688, height: 260000 },
];

export default function MissionHud() {
    const layers = useStore((s) => s.layers);
    const viewerRef = useStore((s) => s.viewerRef);
    const activeShader = useStore((s) => s.activeShader);
    const inspector = useStore((s) => s.inspector);
    const layerPanelOpen = useStore((s) => s.layerPanelOpen);

    const LAYER_SCALE = {
        aircraft: 10000,
        satellites: 12000,
        seismic: 600,
        airports: 10000,
        seismicStations: 5000,
        cctv: 8000,
        traffic: 1200,
        conflicts: 1200,
        militaryActivity: 1000,
        militaryBases: 3000,
        forbiddenZones: 1500,
        airspace: 1500,
    };

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

    const focusCity = (city) => {
        if (!viewerRef || viewerRef.isDestroyed()) return;
        viewerRef.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(city.longitude, city.latitude, city.height),
            orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-65),
                roll: 0,
            },
            duration: 1.8,
        });
    };

    return (
        <>
            <div
                className={`mission-hud-left pointer-events-none z-10 ${
                    layerPanelOpen ? 'mission-hud-left--offset' : ''
                }`}
            >
                <div className="mission-label">TOP SECRET // SI-TK // NOFORN</div>
                <div className="mission-title">{activeShader} MODE</div>
                <div className="mission-sub">SURVEILLANCE NODE ACTIVE</div>
            </div>

            {metrics.length > 0 && (
                <div
                    className={`mission-hud-right pointer-events-auto z-10 ${
                        inspector ? 'mission-hud-right--offset' : ''
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
                {CITY_PRESETS.map((city) => (
                    <button key={city.name} className="city-chip" onClick={() => focusCity(city)}>
                        {city.name}
                    </button>
                ))}
            </div>
        </>
    );
}
