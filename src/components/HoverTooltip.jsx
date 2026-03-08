import React from 'react';
import useStore from '../store/useStore';
import { LAYER_DEFS } from '../constants/dataSources';

const TOOLTIP_WIDTH = 290;
const TOOLTIP_HEIGHT = 210;
const TOOLTIP_OFFSET = 18;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function shouldHideField(key, value) {
    if (!key || key.startsWith('_')) return true;
    if (typeof value === 'object') return true;
    if (
        key === 'type' ||
        key === 'name' ||
        key === 'screenX' ||
        key === 'screenY' ||
        key === 'timestamp' ||
        key === 'url' ||
        key === 'videoUrl' ||
        key === 'fallbackUrl' ||
        key === 'detailsUrl' ||
        key === 'mediaType' ||
        key === 'refreshSeconds'
    ) {
        return true;
    }
    return false;
}

export default function HoverTooltip() {
    const hoverInfo = useStore((s) => s.hoverInfo);
    const inspector = useStore((s) => s.inspector);

    if (!hoverInfo || inspector) return null;

    const def = LAYER_DEFS[hoverInfo.type] || { color: '#ffffff', icon: '❓', label: 'UNKNOWN' };
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
    const left = clamp(hoverInfo.screenX + TOOLTIP_OFFSET, 12, viewportWidth - TOOLTIP_WIDTH - 12);
    const top = clamp(hoverInfo.screenY + TOOLTIP_OFFSET, 12, viewportHeight - TOOLTIP_HEIGHT - 12);

    const fields = Object.entries(hoverInfo)
        .filter(([key, value]) => !shouldHideField(key, value))
        .slice(0, 8);

    return (
        <div
            className="fixed pointer-events-none z-[55] animate-fade-in"
            style={{ left, top, width: `${TOOLTIP_WIDTH}px` }}
        >
            <div className="glass-panel p-3 border border-electric-blue/30 shadow-[0_0_18px_rgba(0,180,255,0.18)]">
                <div className="flex items-center gap-2 border-b border-border-panel pb-2 mb-2">
                    <span className="text-base" style={{ color: def.color }}>{def.icon}</span>
                    <div className="text-[11px] tracking-widest text-white">{def.label} PREVIEW</div>
                </div>

                <div className="text-sm text-white tracking-wide truncate mb-2">
                    {hoverInfo.name || hoverInfo.callsign || hoverInfo.id || 'UNIDENTIFIED'}
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {fields.map(([key, value]) => (
                        <div key={key} className="min-w-0">
                            <div className="text-[9px] text-text-dim tracking-widest uppercase">{key}</div>
                            <div className="text-[11px] text-text-primary tracking-wide truncate" title={String(value)}>
                                {value !== null && value !== undefined ? String(value) : 'N/A'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
