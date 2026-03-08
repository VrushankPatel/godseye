import React, { useEffect } from 'react';
import Globe from './components/Globe';
import TopBar from './components/TopBar';
import LayerPanel from './components/LayerPanel';
import ShaderToolbar from './components/ShaderToolbar';
import Inspector from './components/Inspector';
import HoverTooltip from './components/HoverTooltip';
import Reticle from './components/Reticle';
import ShaderOverlay from './components/ShaderOverlay';
import MissionHud from './components/MissionHud';
import FlightFilterPanel from './components/FlightFilterPanel';
import useStore from './store/useStore';
import { SHADER_MODES } from './constants/dataSources';

export default function App() {
    const activeShader = useStore((s) => s.activeShader);
    const setShader = useStore((s) => s.setShader);
    const enableAllLayers = useStore((s) => s.enableAllLayers);
    const clearInspector = useStore((s) => s.clearInspector);

    // Keyboard shortcuts: 1-6 for shader modes, Escape to close inspector
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const keyNum = parseInt(e.key);
            if (keyNum >= 1 && keyNum <= 6) {
                const mode = SHADER_MODES[keyNum - 1];
                if (mode) {
                    setShader(mode.id);
                    if (mode.id === 'GOD') {
                        enableAllLayers();
                    }
                }
            }

            if (e.key === 'Escape') {
                clearInspector();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setShader, enableAllLayers, clearInspector]);

    const getGlobeModeClass = () => {
        switch (activeShader) {
            case 'NVG': return 'mode-nvg';
            case 'FLIR': return 'mode-flir';
            case 'CRT': return 'mode-crt';
            case 'ANIME': return 'mode-anime';
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

            {/* Reticle */}
            <Reticle />

            {/* UI Overlay */}
            <TopBar />
            <LayerPanel />
            <ShaderToolbar />
            <Inspector />
            <HoverTooltip />
            <MissionHud />
            <FlightFilterPanel />
        </div>
    );
}
