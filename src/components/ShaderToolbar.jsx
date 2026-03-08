import React from 'react';
import useStore from '../store/useStore';
import { SHADER_MODES } from '../constants/dataSources';

export default function ShaderToolbar() {
    const activeShader = useStore((s) => s.activeShader);
    const setShader = useStore((s) => s.setShader);
    const enableAllLayers = useStore((s) => s.enableAllLayers);

    const handleModeClick = (modeId) => {
        setShader(modeId);
        if (modeId === 'GOD') {
            enableAllLayers();
        }
    };

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-10 animate-slide-up">
            <div className="glass-panel px-6 py-3 flex flex-col items-center gap-3 pointer-events-auto rounded-full pb-4">

                <div className="text-[10px] tracking-[0.3em] text-text-dim uppercase font-semibold">
                    VISUAL_MODE_OVERRIDE
                </div>

                <div className="flex gap-2">
                    {SHADER_MODES.map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => handleModeClick(mode.id)}
                            className={`mode-btn ${activeShader === mode.id ? 'active' : ''}`}
                        >
                            <span className="opacity-50 mr-2 text-[9px]">{mode.key}</span>
                            {mode.label}
                        </button>
                    ))}
                </div>

            </div>
        </div>
    );
}
