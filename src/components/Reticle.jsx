import React from 'react';
import useStore from '../store/useStore';

export default function Reticle() {
    const activeShader = useStore((s) => s.activeShader);

    const getReticleColor = () => {
        switch (activeShader) {
            case 'NVG': return 'rgba(0, 255, 65, 0.4)';  // Neon Green
            case 'FLIR': return 'rgba(255, 100, 0, 0.4)'; // Orange/Amber
            case 'CRT': return 'rgba(255, 170, 0, 0.4)';  // CRT Amber
            case 'SURVEILLANCE': return 'rgba(0, 212, 255, 0.45)';
            default: return 'rgba(255, 255, 255, 0.2)'; // White
        }
    };

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 w-96 h-96 flex items-center justify-center mix-blend-screen opacity-70 transition-colors duration-500">
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 100 100"
                xmlns="http://www.w3.org/2000/svg"
                style={{ stroke: getReticleColor() }}
            >
                {/* Outer Ring */}
                <circle cx="50" cy="50" r="45" fill="none" strokeWidth="0.5" strokeDasharray="2 4" />

                {/* Inner Ring */}
                <circle cx="50" cy="50" r="30" fill="none" strokeWidth="0.2" />
                <circle cx="50" cy="50" r="32" fill="none" strokeWidth="0.5" strokeDasharray="1 10" />

                {/* Crosshairs */}
                <line x1="5" y1="50" x2="40" y2="50" strokeWidth="0.5" />
                <line x1="60" y1="50" x2="95" y2="50" strokeWidth="0.5" />
                <line x1="50" y1="5" x2="50" y2="40" strokeWidth="0.5" />
                <line x1="50" y1="60" x2="50" y2="95" strokeWidth="0.5" />

                {/* Center Target */}
                <circle cx="50" cy="50" r="2" fill="none" strokeWidth="1" />
                <circle cx="50" cy="50" r="0.5" fill="currentColor" />

                {/* Corner Brackets */}
                <path d="M 20 20 L 25 20 M 20 20 L 20 25" fill="none" strokeWidth="1" />
                <path d="M 80 20 L 75 20 M 80 20 L 80 25" fill="none" strokeWidth="1" />
                <path d="M 20 80 L 25 80 M 20 80 L 20 75" fill="none" strokeWidth="1" />
                <path d="M 80 80 L 75 80 M 80 80 L 80 75" fill="none" strokeWidth="1" />

                {/* Tick Marks on Crosshairs */}
                <line x1="20" y1="48" x2="20" y2="52" strokeWidth="0.5" />
                <line x1="30" y1="49" x2="30" y2="51" strokeWidth="0.5" />
                <line x1="80" y1="48" x2="80" y2="52" strokeWidth="0.5" />
                <line x1="70" y1="49" x2="70" y2="51" strokeWidth="0.5" />

                <line x1="48" y1="20" x2="52" y2="20" strokeWidth="0.5" />
                <line x1="49" y1="30" x2="51" y2="30" strokeWidth="0.5" />
                <line x1="48" y1="80" x2="52" y2="80" strokeWidth="0.5" />
                <line x1="49" y1="70" x2="51" y2="70" strokeWidth="0.5" />
            </svg>
        </div>
    );
}
