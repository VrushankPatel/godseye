import React from 'react';
import useStore from '../store/useStore';
import { SHADER_MODES } from '../constants/dataSources';
import CityTiltControl from './CityTiltControl';

const TOOLBAR_PANEL_HEIGHT_PX = 176;

export default function ShaderToolbar() {
    const activeShader = useStore((s) => s.activeShader);
    const setShader = useStore((s) => s.setShader);
    const enableAllLayers = useStore((s) => s.enableAllLayers);
    const enableSurveillanceLayers = useStore((s) => s.enableSurveillanceLayers);
    const city3DActive = useStore((s) => s.city3DActive);
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
    const gridCells = [
        ...SHADER_MODES.map((mode) => ({ type: 'shader', mode })),
        { type: 'focus' },
        focusMode
            ? { type: 'hide' }
            : { type: 'placeholder', key: 'focus-hide-placeholder' },
        { type: 'placeholder', key: 'grid-padding-cell' },
    ];

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-10 animate-slide-up">
            <div className="flex items-stretch gap-3">
                <div
                    className="glass-panel px-8 py-5 flex flex-col items-center gap-4 pointer-events-auto rounded-full"
                    style={{
                        height: `${TOOLBAR_PANEL_HEIGHT_PX}px`,
                        boxSizing: 'border-box',
                    }}
                >

                    <div className="text-[10px] tracking-[0.3em] text-text-dim uppercase font-semibold">
                        VISUAL_MODE_OVERRIDE
                    </div>

                    {city3DActive ? (
                        <div
                            className="grid grid-cols-3 gap-3 w-[560px] max-w-[74vw] flex-1 items-stretch content-stretch"
                            style={{ gridAutoRows: '1fr' }}
                        >
                            {gridCells.map((cell) => {
                                if (cell.type === 'placeholder') {
                                    return (
                                        <div
                                            key={cell.key}
                                            className="mode-btn mode-btn-grid mode-btn-placeholder"
                                            aria-hidden="true"
                                        />
                                    );
                                }

                                if (cell.type === 'focus') {
                                    return (
                                        <button
                                            key="focus-mode-button"
                                            onClick={toggleFocusMode}
                                            className={`mode-btn mode-btn-grid ${focusMode ? 'active' : ''}`}
                                        >
                                            <span className="opacity-50 text-[9px]">7</span>
                                            Focus
                                        </button>
                                    );
                                }

                                if (cell.type === 'hide') {
                                    return (
                                        <button
                                            key="focus-hide-entities-button"
                                            onClick={() => setFocusHideEntities(!focusHideEntities)}
                                            className={`mode-btn mode-btn-grid ${focusHideEntities ? 'active' : ''}`}
                                        >
                                            <span className="opacity-50 text-[9px]">8</span>
                                            {focusHideEntities ? 'Show' : 'Hide'}
                                        </button>
                                    );
                                }

                                return (
                                    <button
                                        key={cell.mode.id}
                                        onClick={() => handleModeClick(cell.mode.id)}
                                        className={`mode-btn mode-btn-grid ${activeShader === cell.mode.id ? 'active' : ''}`}
                                    >
                                        <span className="opacity-50 text-[9px]">{cell.mode.key}</span>
                                        {cell.mode.label}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col justify-center items-center gap-3 flex-1">
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
                    )}
                </div>
                <CityTiltControl panelHeight={TOOLBAR_PANEL_HEIGHT_PX} />
            </div>
        </div>
    );
}
