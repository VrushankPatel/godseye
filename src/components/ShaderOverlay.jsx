import React from 'react';
import useStore from '../store/useStore';

export default function ShaderOverlay() {
    const activeShader = useStore((s) => s.activeShader);

    if (activeShader === 'DEFAULT') {
        return null;
    }

    const getOverlayClass = () => {
        switch (activeShader) {
            case 'NVG': return 'shader-nvg';
            case 'FLIR': return 'shader-flir';
            case 'CRT': return 'shader-crt';
            case 'GOD': return 'shader-god';
            case 'SURVEILLANCE': return 'shader-surveillance';
            default: return '';
        }
    };

    return (
        <div className={`shader-overlay ${getOverlayClass()}`} />
    );
}
