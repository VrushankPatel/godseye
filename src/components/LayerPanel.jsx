import React from 'react';
import useStore from '../store/useStore';
import { LAYER_DEFS } from '../constants/dataSources';

export default function LayerPanel() {
    const {
        layers,
        toggleLayer,
        enableAllLayers,
        layerPanelOpen,
        toggleLayerPanel
    } = useStore();

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
            className="absolute top-24 bottom-24 w-72 flex flex-col pointer-events-none z-10 animate-slide-left"
            style={{ left: 'max(16px, env(safe-area-inset-left))' }}
        >
            <div className="glass-panel w-full h-full flex flex-col pointer-events-auto">

                {/* Header */}
                <div className="px-5 py-4 border-b border-border-panel flex justify-between items-center bg-black/20">
                    <h2 className="text-sm tracking-widest leading-none text-white/90">DATA_LAYERS</h2>
                    <button onClick={toggleLayerPanel} className="text-text-dim hover:text-white transition-colors">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                </div>

                {/* Layer List */}
                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                    {Object.entries(layers).map(([key, layer]) => {
                        const def = LAYER_DEFS[key];
                        if (!def) return null;

                        return (
                            <div key={key} className="flex flex-col gap-2 px-1 py-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span style={{ color: def.color }} className="text-lg w-5 text-center">
                                            {def.icon}
                                        </span>
                                        <span className={`text-sm tracking-wider ${layer.enabled ? 'text-white' : 'text-text-dim'}`}>
                                            {def.label}
                                        </span>
                                    </div>

                                    <div
                                        className={`toggle-switch ${layer.enabled ? 'active' : ''}`}
                                        onClick={() => toggleLayer(key)}
                                    />
                                </div>

                                {/* Status Bar for Layer */}
                                <div className="ml-[2.125rem] flex justify-between items-center text-[10px] tracking-widest uppercase">
                                    {layer.status === 'error' ? (
                                        <span className="text-neon-red bg-neon-red/10 px-1 py-0.5 rounded">FEED OFFLINE</span>
                                    ) : layer.status === 'loading' ? (
                                        <span className="text-neon-amber animate-pulse">ACQUIRING...</span>
                                    ) : layer.enabled ? (
                                        <span className="text-neon-green">ACTIVE</span>
                                    ) : (
                                        <span className="text-text-dim">STANDBY</span>
                                    )}

                                    {layer.enabled && layer.status === 'active' && (
                                        <span className="text-electric-blue">
                                            {layer.count.toLocaleString()} <span className="text-text-dim">TRK</span>
                                        </span>
                                    )}
                                </div>
                                <div className="w-full h-[1px] bg-white/5 mt-1" />
                            </div>
                        );
                    })}
                </div>

                {/* Footer (God Mode) */}
                <div className="px-5 py-4 border-t border-border-panel bg-black/20">
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
