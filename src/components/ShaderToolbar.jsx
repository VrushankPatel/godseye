import React from 'react';
import useStore from '../store/useStore';
import { SHADER_MODES } from '../constants/dataSources';

export default function ShaderToolbar() {
    const activeShader = useStore((s) => s.activeShader);
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
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-10 animate-slide-up">
            <div className="glass-panel px-8 py-5 flex flex-col items-center gap-4 pointer-events-auto rounded-full pb-5">

                <div className="text-[10px] tracking-[0.3em] text-text-dim uppercase font-semibold">
                    VISUAL_MODE_OVERRIDE
                </div>

                {/* Row 1: First 4 shader modes */}
                <div className="flex gap-3">
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

                {/* Row 2: Remaining modes + Focus + Hide Entities */}
                <div className="flex gap-3">
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
    );
}
