import React from 'react';
import useStore from '../store/useStore';

export default function HoverTooltip() {
    const hoverInfo = useStore((s) => s.hoverInfo);
    if (!hoverInfo) return null;

    return (
        <div
            className="hover-tooltip"
            style={{ top: (hoverInfo.y || 0) - 30, left: (hoverInfo.x || 0) + 10 }}
        >
            {hoverInfo.name} [{hoverInfo.type?.toUpperCase()}]
        </div>
    );
}
