import React from 'react';
import useStore from '../store/useStore';

export default function ShaderOverlay() {
    const activeShader = useStore((s) => s.activeShader);

    if (activeShader === 'DEFAULT' || activeShader === 'GOD') {
        return null;
    }

    const getOverlayClass = () => {
        switch (activeShader) {
            case 'NVG': return 'shader-nvg';
            case 'FLIR': return 'shader-flir';
            case 'CRT': return 'shader-crt';
            case 'ANIME': return 'shader-anime';
            default: return '';
        }
    };

    return (
        <div className={`shader-overlay ${getOverlayClass()}`} />
    );
}
