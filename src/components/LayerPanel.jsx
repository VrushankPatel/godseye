import React from 'react';
import useStore from '../store/useStore';

const LAYER_CONFIG = [
    { key: 'aircraft', icon: '✈', label: 'AIRCRAFT' },
    { key: 'satellites', icon: '🛰', label: 'SATELLITES' },
    { key: 'seismic', icon: '📡', label: 'SEISMIC' },
    { key: 'airports', icon: '🛫', label: 'AIRPORTS' },
    { key: 'maritime', icon: '⚓', label: 'MARITIME' },
    { key: 'powerGrid', icon: '⚡', label: 'POWER GRID' },
    { key: 'cctv', icon: '📹', label: 'CCTV' },
    { key: 'traffic', icon: '🚗', label: 'TRAFFIC' },
    { key: 'conflicts', icon: '⚔', label: 'CONFLICTS' },
    { key: 'militaryActivity', icon: '🎖', label: 'MIL ACTIVITY' },
    { key: 'militaryBases', icon: '🏛', label: 'MIL BASES' },
    { key: 'forbiddenZones', icon: '🚫', label: 'NO-GO ZONES' },
];

export default function LayerPanel() {
    const layers = useStore((s) => s.layers);
    const toggleLayer = useStore((s) => s.toggleLayer);
    const enableAllLayers = useStore((s) => s.enableAllLayers);
    const layerPanelOpen = useStore((s) => s.layerPanelOpen);

    if (!layerPanelOpen) return null;

    return (
        <div className="layer-panel">
            <div className="layer-panel-header">DATA LAYERS</div>
            {LAYER_CONFIG.map(({ key, icon, label }) => {
                const state = layers[key];
                if (!state) return null;
                return (
                    <div
                        key={key}
                        className={`layer-item ${state.enabled ? 'active' : ''}`}
                        onClick={() => toggleLayer(key)}
                    >
                        <div className="layer-item-left">
                            <span className="layer-icon">{icon}</span>
                            <span className="layer-name">{label}</span>
                            <span className={`layer-status-dot ${state.status}`} />
                        </div>
                        <div className={`layer-toggle ${state.enabled ? 'on' : ''}`} />
                    </div>
                );
            })}
            <button className="panoptic-btn" onClick={enableAllLayers}>
                PANOPTIC OVERRIDE
            </button>
        </div>
    );
}
