import React from 'react';
import useStore from '../store/useStore';
import { SHADER_MODES } from '../constants/dataSources';

export default function ShaderToolbar() {
    const activeShader = useStore((s) => s.activeShader);
    const setShader = useStore((s) => s.setShader);
    const enableAllLayers = useStore((s) => s.enableAllLayers);
    const enableSurveillanceLayers = useStore((s) => s.enableSurveillanceLayers);

    const handleClick = (mode) => {
        setShader(mode.id);
        if (mode.id === 'GOD') enableAllLayers();
        else if (mode.id === 'SURVEILLANCE') enableSurveillanceLayers();
    };

    return (
        <div className="shader-toolbar">
            {SHADER_MODES.map((mode) => (
                <button
                    key={mode.id}
                    className={`shader-btn ${activeShader === mode.id ? 'active' : ''}`}
                    onClick={() => handleClick(mode)}
                >
                    +{mode.id}
                </button>
            ))}
        </div>
    );
}
