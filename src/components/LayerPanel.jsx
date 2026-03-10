import React, { useMemo, useState } from 'react';
import useStore from '../store/useStore';
import { LAYER_DEFS, SURVEILLANCE_PRIMARY_LAYERS } from '../constants/dataSources';

export default function LayerPanel() {
    const {
        layers,
        toggleLayer,
        enableAllLayers,
        layerPanelOpen,
        toggleLayerPanel
    } = useStore();
    const [othersOpen, setOthersOpen] = useState(false);

    const { primaryEntries, otherEntries } = useMemo(() => {
        const validEntries = Object.entries(layers).filter(([key]) => Boolean(LAYER_DEFS[key]));
        const byKey = new Map(validEntries);

        const primary = [];
        SURVEILLANCE_PRIMARY_LAYERS.forEach((key) => {
            const layer = byKey.get(key);
            if (!layer) return;
            primary.push([key, layer]);
            byKey.delete(key);
        });

        const others = Array.from(byKey.entries()).sort((a, b) => {
            const aLabel = LAYER_DEFS[a[0]]?.label || a[0];
            const bLabel = LAYER_DEFS[b[0]]?.label || b[0];
            return aLabel.localeCompare(bLabel);
        });

        return {
            primaryEntries: primary,
            otherEntries: others,
        };
    }, [layers]);

    const renderLayerRow = ([key, layer]) => {
        const def = LAYER_DEFS[key];
        if (!def) return null;

        return (
            <div key={key} className="flex flex-col gap-1 px-2 py-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span style={{ color: def.color }} className="text-lg w-6 text-center shrink-0">
                            {def.icon}
                        </span>
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`px-[1px] py-[1px] text-sm leading-tight tracking-wider ${layer.enabled ? 'text-white' : 'text-text-dim'}`}>
                                {def.label}
                            </span>
                            {def.description && (
                                <div className="relative group pointer-events-auto">
                                    <span
                                        className="inline-flex w-3.5 h-3.5 items-center justify-center rounded-full border border-electric-blue/40 text-[9px] text-electric-blue/85"
                                        title={def.description}
                                    >
                                        i
                                    </span>
                                    <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-52 -translate-x-1/2 rounded border border-electric-blue/35 bg-[#041226]/95 p-2 text-[10px] leading-snug tracking-wide text-text-primary opacity-0 shadow-[0_0_14px_rgba(0,180,255,0.18)] transition-opacity group-hover:opacity-100">
                                        {def.description}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div
                        className={`toggle-switch ${layer.enabled ? 'active' : ''}`}
                        onClick={() => toggleLayer(key)}
                    />
                </div>

                <div className="ml-[2.45rem] pr-1 flex justify-between items-center text-[9px] leading-tight tracking-widest uppercase">
                    {layer.status === 'error' ? (
                        <span className="text-neon-red bg-neon-red/10 px-[5px] py-[2px] rounded">FEED OFFLINE</span>
                    ) : layer.status === 'loading' ? (
                        <span className="text-neon-amber animate-pulse px-[1px] py-[1px]">ACQUIRING...</span>
                    ) : layer.enabled ? (
                        <span className="text-neon-green px-[1px] py-[1px]">ACTIVE</span>
                    ) : (
                        <span className="text-text-dim px-[1px] py-[1px]">STANDBY</span>
                    )}

                    {layer.enabled && layer.status === 'active' && (
                        <span className="text-electric-blue px-[1px] py-[1px]">
                            {layer.count.toLocaleString()} <span className="text-text-dim">TRK</span>
                        </span>
                    )}
                </div>
                <div className="w-full h-[1px] bg-white/5" />
            </div>
        );
    };

    if (!layerPanelOpen) {
        return (
            <button
                onClick={toggleLayerPanel}
                className="absolute top-1/2 -translate-y-1/2 glass-panel p-2.5 rounded-r-lg rounded-l-none text-text-dim hover:text-white pointer-events-auto z-10 border-l-0"
                style={{ left: 'max(10px, env(safe-area-inset-left))' }}
            >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>
        );
    }

    return (
        <div
            className="absolute top-24 bottom-4 w-[19.5rem] flex flex-col gap-2 pointer-events-none z-10 animate-slide-left"
            style={{ left: 'max(16px, env(safe-area-inset-left))' }}
        >
            {/* Data Layers Panel */}
            <div className="glass-panel w-full flex-1 min-h-0 flex flex-col pointer-events-auto">

                <div className="px-5 py-4 border-b border-border-panel flex justify-between items-center bg-black/20">
                    <h2 className="text-[13px] tracking-[0.18em] leading-tight text-white/90">Data Layers</h2>
                    <button onClick={toggleLayerPanel} className="text-text-dim hover:text-white transition-colors">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-[14px] py-[10px] flex flex-col gap-1">
                    {primaryEntries.map(renderLayerRow)}

                    {otherEntries.length > 0 && (
                        <div className="pt-1 border-t border-white/10">
                            <button
                                onClick={() => setOthersOpen((open) => !open)}
                                className="w-full flex items-center justify-between px-1 py-2 text-left text-xs tracking-[0.24em] text-text-dim hover:text-white transition-colors"
                            >
                                <span>OTHERS</span>
                                <span className="flex items-center gap-2 text-[10px] tracking-[0.2em]">
                                    {otherEntries.length}
                                    <svg
                                        className={`w-3.5 h-3.5 transition-transform ${othersOpen ? 'rotate-180' : ''}`}
                                        viewBox="0 0 20 20"
                                        fill="none"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 7.5l5 5 5-5" />
                                    </svg>
                                </span>
                            </button>

                            {othersOpen && (
                                <div className="mt-1 flex flex-col gap-2">
                                    {otherEntries.map(renderLayerRow)}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-border-panel bg-black/20">
                    <button
                        onClick={enableAllLayers}
                        className="w-full py-2 border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan text-sm tracking-widest hover:bg-neon-cyan/20 hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] transition-all font-bold uppercase rounded-sm"
                    >
                        PANOPTIC OVERRIDE
                    </button>
                </div>

            </div>
        </div>
    );
}
