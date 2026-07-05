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
import WebcamDock from './components/WebcamDock';
import RenderBoundary from './components/RenderBoundary';
import SharedRuntimeCacheBootstrap from './components/SharedRuntimeCacheBootstrap';
import useStore from './store/useStore';
import { SHADER_MODES } from './constants/dataSources';

export default function App() {
    const activeShader = useStore((s) => s.activeShader);
    const globeViewMode = useStore((s) => s.globeViewMode);
    const setShader = useStore((s) => s.setShader);
    const setAppIsActive = useStore((s) => s.setAppIsActive);
    const enableAllLayers = useStore((s) => s.enableAllLayers);
    const enableSurveillanceLayers = useStore((s) => s.enableSurveillanceLayers);
    const clearInspector = useStore((s) => s.clearInspector);
    const clearTrackedTarget = useStore((s) => s.clearTrackedTarget);
    const toggleFocusMode = useStore((s) => s.toggleFocusMode);
    const focusHideEntities = useStore((s) => s.focusHideEntities);
    const setFocusHideEntities = useStore((s) => s.setFocusHideEntities);

    useEffect(() => {
        const computeAppIsActive = () => {
            if (typeof document === 'undefined') return true;
            const isVisible = !document.hidden;
            const hasFocus = typeof document.hasFocus === 'function' ? document.hasFocus() : true;
            return Boolean(isVisible && hasFocus);
        };

        const syncAppActivity = () => {
            setAppIsActive(computeAppIsActive());
        };

        syncAppActivity();

        document.addEventListener('visibilitychange', syncAppActivity);
        window.addEventListener('focus', syncAppActivity);
        window.addEventListener('blur', syncAppActivity);
        window.addEventListener('pageshow', syncAppActivity);

        return () => {
            document.removeEventListener('visibilitychange', syncAppActivity);
            window.removeEventListener('focus', syncAppActivity);
            window.removeEventListener('blur', syncAppActivity);
            window.removeEventListener('pageshow', syncAppActivity);
        };
    }, [setAppIsActive]);

    // Keyboard shortcuts: 1-6 shader modes, 7 Focus, 8 Hide Entities, Escape close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const keyNum = parseInt(e.key);
            if (keyNum >= 1 && keyNum <= SHADER_MODES.length) {
                const mode = SHADER_MODES[keyNum - 1];
                if (mode) {
                    if (activeShader === mode.id) {
                        setShader('DEFAULT');
                    } else {
                        setShader(mode.id);
                        if (mode.id === 'GOD') enableAllLayers();
                        else if (mode.id === 'SURVEILLANCE') enableSurveillanceLayers();
                    }
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
    }, [activeShader, setShader, setAppIsActive, enableAllLayers, enableSurveillanceLayers, clearInspector, clearTrackedTarget, toggleFocusMode, focusHideEntities, setFocusHideEntities]);

    const getGlobeModeClass = () => {
        switch (activeShader) {
            case 'NVG': return 'mode-nvg';
            case 'FLIR': return 'mode-flir';
            case 'CRT': return 'mode-crt';
            default: return '';
        }
    };

    return (
        <div
            className={`godseye-app godseye-app--${globeViewMode}`}
            style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#0a0a0f' }}
        >
            <SharedRuntimeCacheBootstrap />
            {/* 3D Globe */}
            <div className="globe-shell">
                <div className={`globe-container ${getGlobeModeClass()}`}>
                    <RenderBoundary name="globe">
                        <Globe />
                    </RenderBoundary>
                </div>
            </div>

            {/* Shader Overlay Effects */}
            <RenderBoundary name="shader-overlay">
                <ShaderOverlay />
            </RenderBoundary>
            <RenderBoundary name="focus-mask">
                <FocusMask />
            </RenderBoundary>

            {/* Reticle */}
            <RenderBoundary name="reticle">
                <Reticle />
            </RenderBoundary>

            {/* UI Overlay */}
            <RenderBoundary name="top-bar">
                <TopBar />
            </RenderBoundary>
            <RenderBoundary name="layer-panel">
                <LayerPanel />
            </RenderBoundary>
            <RenderBoundary name="shader-toolbar">
                <ShaderToolbar />
            </RenderBoundary>
            <RenderBoundary name="hover-tooltip">
                <HoverTooltip />
            </RenderBoundary>
            <RenderBoundary name="mission-hud">
                <MissionHud />
            </RenderBoundary>
            <RenderBoundary name="sys-terminal">
                <SysTerminal />
            </RenderBoundary>
            <RenderBoundary name="webcam-dock">
                <WebcamDock />
            </RenderBoundary>
        </div>
    );
}
