import React, { useEffect, useRef } from 'react';
import GlobeGL from './components/GlobeGL';
import TopBar from './components/TopBar';
import LayerPanel from './components/LayerPanel';
import ShaderToolbar from './components/ShaderToolbar';
import Inspector from './components/Inspector';
import HoverTooltip from './components/HoverTooltip';
import Reticle from './components/Reticle';
import MissionHud from './components/MissionHud';
import SysLog from './components/SysLog';
import CityPresets from './components/CityPresets';
import FocusMask from './components/FocusMask';
import useStore from './store/useStore';
import { SHADER_MODES } from './constants/dataSources';

/* ── Layer data loaders (headless — fetch only, no Cesium) ── */
import AircraftLayer from './layers/AircraftLayer';
import SatelliteLayer from './layers/SatelliteLayer';
import CameraLayer from './layers/CameraLayer';
import SeismicLayer from './layers/SeismicLayer';

export default function App() {
    const activeShader = useStore((s) => s.activeShader);
    const setShader = useStore((s) => s.setShader);
    const enableAllLayers = useStore((s) => s.enableAllLayers);
    const enableSurveillanceLayers = useStore((s) => s.enableSurveillanceLayers);
    const clearInspector = useStore((s) => s.clearInspector);
    const focusMode = useStore((s) => s.focusMode);
    const toggleFocusMode = useStore((s) => s.toggleFocusMode);
    const focusHideEntities = useStore((s) => s.focusHideEntities);
    const setFocusHideEntities = useStore((s) => s.setFocusHideEntities);
    const globeRef = useRef(null);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const keyNum = parseInt(e.key);
            if (keyNum >= 1 && keyNum <= 7) {
                const mode = SHADER_MODES[keyNum - 1];
                if (mode) {
                    setShader(mode.id);
                    if (mode.id === 'GOD') enableAllLayers();
                    else if (mode.id === 'SURVEILLANCE') enableSurveillanceLayers();
                }
            }
            if (e.key === 'Escape') clearInspector();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setShader, enableAllLayers, enableSurveillanceLayers, clearInspector]);

    const getGlobeModeClass = () => {
        switch (activeShader) {
            case 'NVG': return 'mode-nvg';
            case 'FLIR': return 'mode-flir';
            case 'CRT': return 'mode-crt';
            default: return '';
        }
    };

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#000' }}>
            {/* 3D Globe */}
            <div className={`globe-container ${getGlobeModeClass()}`}>
                <GlobeGL ref={globeRef} />
            </div>

            {/* Focus Mask */}
            <FocusMask />

            {/* Reticle */}
            <Reticle />

            {/* UI Overlay */}
            <TopBar />
            <LayerPanel />
            <Inspector />
            <HoverTooltip />
            <MissionHud />
            <SysLog />

            {/* Bottom Bar */}
            <div className="bottom-bar">
                <CityPresets globeRef={globeRef} />
                <ShaderToolbar />
                <div className="bottom-actions">
                    <button
                        className={`action-btn focus-mode ${focusMode ? 'active' : ''}`}
                        onClick={toggleFocusMode}
                    >
                        FOCUS MODE
                    </button>
                    <button
                        className={`action-btn ${focusHideEntities ? 'active' : ''}`}
                        onClick={() => setFocusHideEntities(!focusHideEntities)}
                    >
                        {focusHideEntities ? 'SHOW ENTITIES' : 'HIDE ENTITIES'}
                    </button>
                </div>
            </div>

            {/* Headless data layers (fetch only — no viewer needed) */}
            <AircraftLayer viewer={null} />
            <SatelliteLayer viewer={null} />
            <CameraLayer viewer={null} />
            <SeismicLayer viewer={null} />
        </div>
    );
}
