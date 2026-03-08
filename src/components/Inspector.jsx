import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { LAYER_DEFS } from '../constants/dataSources';

export default function Inspector() {
    const inspector = useStore((s) => s.inspector);
    const clearInspector = useStore((s) => s.clearInspector);
    const [isMaximized, setIsMaximized] = useState(false);

    // Close maximized state when inspector changes or unmounts
    useEffect(() => {
        setIsMaximized(false);
    }, [inspector]);

    if (!inspector) return null;

    const def = LAYER_DEFS[inspector.type] || { color: '#ffffff', icon: '❓', label: 'UNKNOWN' };

    return (
        <>
            <div className="absolute right-4 top-24 w-80 pointer-events-none z-10 animate-slide-right">
                <div className="glass-panel w-full flex flex-col pointer-events-auto shadow-[0_0_20px_rgba(0,180,255,0.15)]">

                    {/* Header */}
                    <div className="p-3 border-b border-border-panel flex justify-between items-center bg-black/40">
                        <div className="flex items-center gap-2">
                            <span style={{ color: def.color }} className="text-lg">{def.icon}</span>
                            <h2 className="text-sm tracking-widest text-text-primary">{def.label} TRK</h2>
                        </div>
                        <button
                            onClick={clearInspector}
                            className="text-text-dim hover:text-white hover:scale-110 transition-all font-bold"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex flex-col gap-3">

                        <div className="flex flex-col gap-1 mb-2">
                            <div className="text-[10px] text-text-dim tracking-widest uppercase">Target Ident</div>
                            <div className="text-xl font-bold tracking-wider text-white" style={{ textShadow: `0 0 10px ${def.color}40` }}>
                                {inspector.name || inspector.callsign || inspector.id || 'UNIDENTIFIED'}
                            </div>
                        </div>

                        {/* Camera Feed Embed */}
                        {inspector.type === 'cctv' && (
                            <div className="w-full mb-3 rounded overflow-hidden relative group">
                                <img
                                    src={inspector.url}
                                    alt="Feed"
                                    className="feed-image relative z-10 w-full cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => setIsMaximized(true)}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                        if (inspector.fallbackUrl && e.target.src !== inspector.fallbackUrl) {
                                            setTimeout(() => {
                                                e.target.src = inspector.fallbackUrl;
                                                e.target.style.display = 'block';
                                                e.target.nextSibling.style.display = 'none';
                                            }, 1000);
                                        }
                                    }}
                                />
                                <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setIsMaximized(true)}
                                        className="bg-black/80 px-2 py-1 text-[10px] text-white border border-white/20 hover:bg-white/20 transition-colors"
                                    >
                                        MAXIMIZE ⤢
                                    </button>
                                </div>
                                <div className="no-signal hidden text-white text-center py-8 border border-red-500/30 bg-red-900/20">
                                    NO SIGNAL
                                </div>
                            </div>
                        )}

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                            {Object.entries(inspector).map(([key, value]) => {
                                if (key === 'type' || key === 'name' || key.startsWith('_') || typeof value === 'object' || key === 'url' || key === 'fallbackUrl') {
                                    return null;
                                }
                                return (
                                    <div key={key} className="flex flex-col gap-0.5">
                                        <div className="text-[9px] text-text-dim tracking-widest uppercase">{key}</div>
                                        <div className="text-xs text-text-primary tracking-wider truncate" title={String(value)}>
                                            {value !== null && value !== undefined ? String(value) : 'N/A'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="p-2 border-t border-border-panel bg-black/40 flex justify-between items-center text-[9px] text-text-dim tracking-[0.2em] px-4">
                        <span>TRACKING ACTIVE</span>
                        <span className="animate-pulse" style={{ color: def.color }}>●</span>
                    </div>

                </div>
            </div>

            {/* Maximized CCTV Modal */}
            {isMaximized && inspector.type === 'cctv' && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 backdrop-blur-sm pointer-events-auto cursor-pointer"
                    onClick={() => setIsMaximized(false)}
                >
                    <div
                        className="relative max-w-7xl max-h-[85vh] object-contain border border-cyan-500/30 shadow-[0_0_50px_rgba(0,255,80,0.15)] cursor-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-4 left-4 px-3 py-1 bg-black/80 text-green-500 font-mono text-sm border border-green-500/50 z-10 shadow-[0_0_10px_rgba(0,255,80,0.3)] flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> LIVE FEED - {inspector.name || 'CCTV CAMERA'}
                        </div>
                        <button
                            className="absolute top-4 right-4 text-white hover:text-red-500 hover:scale-110 transition-transform text-3xl font-bold z-10 bg-black/50 border border-white/20 w-10 h-10 flex items-center justify-center rounded-sm"
                            onClick={() => setIsMaximized(false)}
                        >
                            ✕
                        </button>
                        <img
                            src={inspector.url}
                            alt="Maximized Feed"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                if (inspector.fallbackUrl && e.target.src !== inspector.fallbackUrl) {
                                    e.target.src = inspector.fallbackUrl;
                                }
                            }}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
