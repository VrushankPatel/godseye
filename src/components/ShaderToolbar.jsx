import React from 'react';
import useStore from '../store/useStore';
import { SHADER_MODES } from '../constants/dataSources';
import CityTiltControl from './CityTiltControl';

const DOCKED_TOOLBAR_HEIGHT_PX = 124;

export default function ShaderToolbar() {
    const activeShader = useStore((s) => s.activeShader);
    const uiLayoutMode = useStore((s) => s.uiLayoutMode);
    const setShader = useStore((s) => s.setShader);
    const enableAllLayers = useStore((s) => s.enableAllLayers);
    const enableSurveillanceLayers = useStore((s) => s.enableSurveillanceLayers);
    const focusMode = useStore((s) => s.focusMode);
    const toggleFocusMode = useStore((s) => s.toggleFocusMode);
    const focusHideEntities = useStore((s) => s.focusHideEntities);
    const setFocusHideEntities = useStore((s) => s.setFocusHideEntities);

    const handleModeClick = (modeId) => {
        setShader(modeId);
        if (modeId === 'GOD') {
            enableAllLayers();
        } else if (modeId === 'SURVEILLANCE') {
            enableSurveillanceLayers();
        }
    };

    // Split into two rows of up to 4
    const row1 = SHADER_MODES.slice(0, 4);
    const row2 = SHADER_MODES.slice(4);

    return (
        <div className={`shader-toolbar-shell absolute pointer-events-none z-10 animate-slide-up ${uiLayoutMode === 'partitioned' ? 'shader-toolbar-shell--partitioned' : ''}`}>
            <div className="flex items-start gap-3">
                <div
                    className="glass-panel px-10 pt-3 pb-4 flex flex-col items-center gap-3 pointer-events-auto rounded-full"
                    style={{
                        height: `${DOCKED_TOOLBAR_HEIGHT_PX}px`,
                        boxSizing: 'border-box',
                    }}
                >

                    <div className="text-[10px] tracking-[0.3em] text-text-dim uppercase font-semibold">
                        VISUAL_MODE_OVERRIDE
                    </div>

                    <div className="flex flex-col justify-center items-center gap-3 flex-1 w-full">
                        <div className="flex w-full justify-center gap-3 px-4">
                            {row1.map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => handleModeClick(mode.id)}
                                    className={`mode-btn ${activeShader === mode.id ? 'active' : ''}`}
                                >
                                    <span className="opacity-50 text-[9px]">{mode.key}</span>
                                    {mode.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex w-full justify-center gap-3 px-4">
                            {row2.map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => handleModeClick(mode.id)}
                                    className={`mode-btn ${activeShader === mode.id ? 'active' : ''}`}
                                >
                                    <span className="opacity-50 text-[9px]">{mode.key}</span>
                                    {mode.label}
                                </button>
                            ))}
                            <button
                                onClick={toggleFocusMode}
                                className={`mode-btn ${focusMode ? 'active' : ''}`}
                            >
                                <span className="opacity-50 text-[9px]">7</span>
                                Focus
                            </button>
                            {focusMode && (
                                <button
                                    onClick={() => setFocusHideEntities(!focusHideEntities)}
                                    className={`mode-btn ${focusHideEntities ? 'active' : ''}`}
                                >
                                    <span className="opacity-50 text-[9px]">8</span>
                                    {focusHideEntities ? 'Show' : 'Hide'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <CityTiltControl panelHeight={DOCKED_TOOLBAR_HEIGHT_PX} />
            </div>
        </div>
    );
}
