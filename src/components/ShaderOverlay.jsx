import React from 'react';
import useStore from '../store/useStore';

export default function ShaderOverlay() {
    const activeShader = useStore((s) => s.activeShader);

    if (activeShader === 'DEFAULT' || activeShader === 'GOD' || activeShader === 'SURVEILLANCE') {
        return null;
    }

    const getOverlayClass = () => {
        switch (activeShader) {
            case 'NVG': return 'shader-nvg';
            case 'FLIR': return 'shader-flir';
            case 'CRT': return 'shader-crt';
            default: return '';
        }
    };

    return (
        <div className={`shader-overlay ${getOverlayClass()}`} />
    );
}
