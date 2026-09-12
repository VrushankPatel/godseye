import React from 'react';
import useStore from '../store/useStore';
import { LAYER_DEFS } from '../constants/dataSources';
import {
    formatLayerAge,
    getLayerHealthColorClass,
    getLayerHealthLabel,
} from '../utils/layerHealth';

import CctvHoverPlayer from './CctvHoverPlayer';

const TOOLTIP_WIDTH = 290;
const TOOLTIP_HEIGHT = 210;
const CCTV_TOOLTIP_WIDTH = 320;
const CCTV_TOOLTIP_HEIGHT = 280;
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
        key === 'mediaEnabled' ||
        key === 'refreshSeconds'
    ) {
        return true;
    }
    return false;
}

export default function HoverTooltip() {
    const hoverInfo = useStore((s) => s.hoverInfo);
    const inspector = useStore((s) => s.inspector);
    const layers = useStore((s) => s.layers);

    if (!hoverInfo || inspector) return null;

    const isCctv = hoverInfo.type === 'cctv' || (hoverInfo.type === 'traffic' && Boolean(hoverInfo.videoUrl || hoverInfo.url || hoverInfo.fallbackUrl));
    const def = LAYER_DEFS[hoverInfo.type] || { color: '#ffffff', icon: '❓', label: 'UNKNOWN' };
    const layerMeta = layers?.[hoverInfo.type]?.meta || {};
    const sourceLabel = String(layerMeta.sourceName || '').trim();
    const healthLabel = getLayerHealthLabel(layerMeta);
    const healthColorClass = getLayerHealthColorClass(layerMeta);
    const ageLabel = formatLayerAge(layerMeta.ageMs);
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
    const tooltipW = isCctv ? CCTV_TOOLTIP_WIDTH : TOOLTIP_WIDTH;
    const tooltipH = isCctv ? CCTV_TOOLTIP_HEIGHT : TOOLTIP_HEIGHT;
    const left = clamp(hoverInfo.screenX + TOOLTIP_OFFSET, 12, viewportWidth - tooltipW - 12);
    const top = clamp(hoverInfo.screenY + TOOLTIP_OFFSET, 12, viewportHeight - tooltipH - 12);

    const fields = Object.entries(hoverInfo)
        .filter(([key, value]) => !shouldHideField(key, value))
        .slice(0, 8);

    return (
        <div
            className="fixed pointer-events-none z-[55] animate-fade-in"
            style={{ left, top, width: `${tooltipW}px` }}
        >
            <div className="glass-panel p-3 border border-electric-blue/30 shadow-[0_0_18px_rgba(0,180,255,0.18)]">
                <div className="flex items-center justify-between border-b border-border-panel pb-2 mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-base" style={{ color: def.color }}>{def.icon}</span>
                        <div className="text-[11px] tracking-widest text-white font-mono font-semibold">
                            {isCctv ? 'CCTV RECON' : `${def.label} PREVIEW`}
                        </div>
                    </div>
                    {isCctv && (
                        <div className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded tracking-widest">
                            STREAM
                        </div>
                    )}
                </div>

                <div className="text-sm text-white tracking-wide truncate mb-2 font-medium">
                    {hoverInfo.name || hoverInfo.callsign || hoverInfo.id || 'UNIDENTIFIED'}
                </div>

                {isCctv ? (
                    <div className="flex flex-col gap-2">
                        <CctvHoverPlayer feed={hoverInfo} />
                        <div className="flex items-center justify-between text-[10px] font-mono text-white/60 pt-1">
                            <span className="truncate max-w-[170px]">{hoverInfo.city || hoverInfo.provider || 'Live Observation'}</span>
                            <span className="text-electric-blue tracking-wider font-semibold">CLICK TO LOCK</span>
                        </div>
                    </div>
                ) : (
                    <>
                        {(sourceLabel || layerMeta.lastSuccessAt || layerMeta.health === 'error') && (
                            <div className="mb-2 grid grid-cols-2 gap-x-3 gap-y-1 rounded border border-white/6 bg-black/20 px-2 py-1.5">
                                <div className="min-w-0">
                                    <div className="text-[9px] text-text-dim tracking-widest uppercase">Source</div>
                                    <div className="text-[11px] text-text-primary tracking-wide truncate" title={sourceLabel || 'Source unavailable'}>
                                        {sourceLabel || 'Source unavailable'}
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[9px] text-text-dim tracking-widest uppercase">Freshness</div>
                                    <div className={`text-[11px] tracking-wide truncate ${healthColorClass}`} title={`${healthLabel} · ${ageLabel}`}>
                                        {healthLabel}{layerMeta.lastSuccessAt ? ` · ${ageLabel}` : ''}
                                    </div>
                                </div>
                            </div>
                        )}

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
                    </>
                )}
            </div>
        </div>
    );
}
