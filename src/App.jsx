import React, { useEffect } from 'react';
import Globe from './components/Globe';
import TopBar from './components/TopBar';
import LayerPanel from './components/LayerPanel';
import ShaderToolbar from './components/ShaderToolbar';
import HoverTooltip from './components/HoverTooltip';
import Reticle from './components/Reticle';
import ShaderOverlay from './components/ShaderOverlay';
import MissionHud from './components/MissionHud';
import FocusMask from './components/FocusMask';
import SysTerminal from './components/SysTerminal';
import useStore from './store/useStore';
import { SHADER_MODES } from './constants/dataSources';

export default function App() {
    const activeShader = useStore((s) => s.activeShader);
    const setShader = useStore((s) => s.setShader);
    const enableAllLayers = useStore((s) => s.enableAllLayers);
    const enableSurveillanceLayers = useStore((s) => s.enableSurveillanceLayers);
    const clearInspector = useStore((s) => s.clearInspector);
    const clearTrackedTarget = useStore((s) => s.clearTrackedTarget);
    const toggleFocusMode = useStore((s) => s.toggleFocusMode);
    const focusHideEntities = useStore((s) => s.focusHideEntities);
    const setFocusHideEntities = useStore((s) => s.setFocusHideEntities);

    // Keyboard shortcuts: 1-6 shader modes, 7 Focus, 8 Hide Entities, Escape close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const keyNum = parseInt(e.key);
            if (keyNum >= 1 && keyNum <= SHADER_MODES.length) {
                const mode = SHADER_MODES[keyNum - 1];
                if (mode) {
                    setShader(mode.id);
                    if (mode.id === 'GOD') enableAllLayers();
                    else if (mode.id === 'SURVEILLANCE') enableSurveillanceLayers();
                }
            } else if (e.key === '7') {
                toggleFocusMode();
            } else if (e.key === '8') {
                setFocusHideEntities(!focusHideEntities);
            }

            if (e.key === 'Escape') {
                clearInspector();
                clearTrackedTarget();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setShader, enableAllLayers, enableSurveillanceLayers, clearInspector, clearTrackedTarget, toggleFocusMode, focusHideEntities, setFocusHideEntities]);

    const getGlobeModeClass = () => {
        switch (activeShader) {
            case 'NVG': return 'mode-nvg';
            case 'FLIR': return 'mode-flir';
            case 'CRT': return 'mode-crt';
            default: return '';
        }
    };

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#0a0a0f' }}>
            {/* 3D Globe */}
            <div className={`globe-container ${getGlobeModeClass()}`}>
                <Globe />
            </div>

            {/* Shader Overlay Effects */}
            <ShaderOverlay />
            <FocusMask />

            {/* Reticle */}
            <Reticle />

            {/* UI Overlay */}
            <TopBar />
            <LayerPanel />
            <ShaderToolbar />
            <HoverTooltip />
            <MissionHud />
            <SysTerminal />
        </div>
    );
}
