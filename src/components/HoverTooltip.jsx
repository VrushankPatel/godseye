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
                            {hoverInfo.isVehicle ? 'VEHICLE RECON' : isCctv ? 'CCTV RECON' : `${def.label} PREVIEW`}
                        </div>
                    </div>
                    {isCctv ? (
                        <div className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded tracking-widest">
                            STREAM
                        </div>
                    ) : hoverInfo.isVehicle ? (
                        <div className="text-[9px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-1.5 py-0.5 rounded tracking-widest uppercase">
                            {hoverInfo.country || 'LIVE'}
                        </div>
                    ) : null}
                </div>

                <div className="text-sm text-white tracking-wide truncate mb-2 font-medium">
                    {hoverInfo.carName || hoverInfo.name || hoverInfo.callsign || hoverInfo.id || 'UNIDENTIFIED'}
                </div>

                {isCctv ? (
                    <div className="flex flex-col gap-2">
                        <CctvHoverPlayer feed={hoverInfo} />
                        <div className="flex items-center justify-between text-[10px] font-mono text-white/60 pt-1">
                            <span className="truncate max-w-[170px]">{hoverInfo.city || hoverInfo.provider || 'Live Observation'}</span>
                            <span className="text-electric-blue tracking-wider font-semibold">CLICK TO LOCK</span>
                        </div>
                    </div>
                ) : hoverInfo.isVehicle ? (
                    <div className="flex flex-col gap-2.5">
                        {/* High-tech Vehicle Card */}
                        <div className="p-2.5 rounded bg-black/60 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,229,255,0.12)]">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest">{hoverInfo.brand || 'Automotive'}</span>
                                        {hoverInfo.countryName && (
                                            <span className="text-[8px] px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-mono">
                                                {hoverInfo.countryName}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm font-bold text-white tracking-wide truncate">
                                        {hoverInfo.carName || hoverInfo.name || hoverInfo.model}
                                    </div>
                                    <div className="text-[10px] text-white/60 font-mono mt-0.5 truncate">
                                        {hoverInfo.model} · {hoverInfo.vehicleCategory || 'Passenger Vehicle'}
                                    </div>
                                </div>

                                {/* Authentic License Plate Badge */}
                                <div className="text-right shrink-0">
                                    <div className="inline-block px-2 py-0.5 rounded bg-[#ffcc00] text-black font-mono font-black text-[11px] tracking-wider border border-black shadow">
                                        {hoverInfo.plate || 'GJ01 AB 4821'}
                                    </div>
                                    <div className="text-[8px] text-cyan-400/70 font-mono mt-0.5 tracking-wider uppercase">
                                        REGISTRATION
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Live Velocity & State Bar */}
                        <div className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/10 text-xs">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${hoverInfo.isStopped ? 'bg-red-500 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                                <span className={`font-mono font-bold text-xs ${hoverInfo.isStopped ? 'text-red-400' : 'text-emerald-300'}`}>
                                    {hoverInfo.isStopped ? 'SIGNAL STOP (0 KM/H)' : `${hoverInfo.speedKmh || 48} KM/H (${hoverInfo.speedMph || 30} MPH)`}
                                </span>
                            </div>
                            <div className="text-[9px] text-white/60 font-mono">
                                HEADING: {hoverInfo.headingDeg !== undefined ? `${Math.round(hoverInfo.headingDeg)}°` : '0°'}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] bg-black/30 p-2 rounded border border-white/5">
                            <div>
                                <span className="text-white/40 text-[8px] uppercase tracking-wider block">Drive Mode</span>
                                <span className="text-white/90 truncate block">{hoverInfo.driverMode || 'Autonomous'}</span>
                            </div>
                            <div>
                                <span className="text-white/40 text-[8px] uppercase tracking-wider block">Powertrain</span>
                                <span className="text-emerald-300 truncate block">{hoverInfo.batteryFuel || hoverInfo.powertrain || 'Hybrid Petrol'}</span>
                            </div>
                            <div className="col-span-2 pt-0.5">
                                <span className="text-white/40 text-[8px] uppercase tracking-wider block">Assigned Corridor</span>
                                <span className="text-cyan-300 truncate block font-mono">{hoverInfo.roadName || hoverInfo.roadType || 'City Arterial'}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-[9px] font-mono pt-1 border-t border-white/10 text-white/60">
                            <span>CALLSIGN: {hoverInfo.callsign || 'UNIT-001'}</span>
                            <span className="text-emerald-400 font-bold tracking-wider animate-pulse">CLICK TO CHASE ➔</span>
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
