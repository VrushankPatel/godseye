import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';

const SLOGANS = [
    "Nowhere to hide",
    "We see everything",
    "No blind spots",
    "Nothing escapes",
    "Every move tracked",
    "You cannot slip through",
    "Every corner under watch",
    "No shadows left",
    "Total control everywhere",
    "We miss nothing",
    "If it moves, we know",
    "Every inch under control",
    "Nothing gets past us",
    "Every breach ends here",
    "Watch everywhere",
    "No ground left uncovered",
    "Every place. Every time.",
    "Nothing left unseen",
    "Every corner covered",
    "Leave nothing unchecked",
    "Complete coverage. Zero gaps.",
    "Every inch accounted for",
    "No gaps. No misses.",
    "Coverage without compromise",
    "Everywhere. Always."
];

export default function TopBar() {
    const [time, setTime] = useState(new Date());
    const [sloganIndex, setSloganIndex] = useState(0);
    const appIsActive = useStore((s) => s.appIsActive);
    const activeFeedCount = useStore((s) => s.getActiveFeedCount());
    const totalEntityCount = useStore((s) => s.getTotalEntityCount());
    const toggleLayerPanel = useStore((s) => s.toggleLayerPanel);
    const requestSharedRuntimeCacheRefresh = useStore((s) => s.requestSharedRuntimeCacheRefresh);
    const sharedRuntimeCache = useStore((s) => s.sharedRuntimeCache);
    const globeViewMode = useStore((s) => s.globeViewMode);
    const toggleGlobeViewMode = useStore((s) => s.toggleGlobeViewMode);

    useEffect(() => {
        if (!appIsActive) return undefined;
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [appIsActive]);

    useEffect(() => {
        if (!appIsActive) return undefined;
        const sloganTimer = setInterval(() => {
            setSloganIndex((prev) => (prev + 1) % SLOGANS.length);
        }, 15000);
        return () => clearInterval(sloganTimer);
    }, [appIsActive]);

    const formatUTC = (date) => {
        return date.toISOString().replace('T', ' ').substring(0, 19) + 'Z';
    };

    return (
        <div
            className="absolute top-0 left-0 right-0 h-20 pointer-events-none z-10 flex justify-between items-start"
            style={{
                paddingTop: 'max(20px, env(safe-area-inset-top))',
                paddingLeft: 'max(24px, env(safe-area-inset-left))',
                paddingRight: 'max(24px, env(safe-area-inset-right))',
            }}
        >

            {/* Left: Branding & Classification */}
            <div className="flex flex-col gap-1 pointer-events-auto animate-slide-left">
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-neon-green/80 shadow-[0_0_10px_rgba(0,255,65,0.8)] animate-pulse" />
                    <h1 className="text-2xl font-bold tracking-[0.3em] text-white" style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>
                        GODSEYE 1.0
                    </h1>
                </div>
                <div className="text-[10px] tracking-widest text-text-dim font-semibold min-h-[16px] transition-opacity duration-300">
                    {SLOGANS[sloganIndex]}
                </div>
                <div className="text-[10px] tracking-wide text-electric-blue/90 font-medium">
                    Built with ❤️ by - Vrushank Patel
                </div>
            </div>

            {/* Top Center: Classification Banner */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-neon-red/10 border border-neon-red/30 px-8 py-1 rounded text-[10px] tracking-[0.2em] text-neon-red font-bold uppercase backdrop-blur-md hidden md:block mt-safe">
                CLASSIFIED // EYES ONLY // GODSEYE
            </div>

            {/* Right: Time & Telemetry */}
            <div className="flex flex-col items-end gap-1 pointer-events-auto animate-slide-right">
                <div className="flex items-center gap-2 text-neon-amber text-sm tracking-wider font-semibold">
                    <span className="w-2 h-2 rounded-full bg-neon-red animate-pulse" />
                    REC {formatUTC(time)}
                </div>

                <div
                    className="glass-panel px-3 py-1.5 mt-2 flex gap-4 text-xs tracking-wider text-text-dim cursor-pointer hover:border-electric-blue/50 hover:bg-electric-blue/5 transition-all"
                    onClick={toggleLayerPanel}
                    title="Toggle Data Feeds Panel"
                >
                    <div>
                        FEEDS <span className="text-white ml-1">{activeFeedCount}</span>
                    </div>
                    <div className="w-[1px] h-4 bg-white/20" />
                    <div>
                        ENTITIES <span className="text-white ml-1">{totalEntityCount.toLocaleString()}</span>
                    </div>
                </div>

                <button
                    className="glass-panel px-3 py-1.5 mt-1 text-[10px] tracking-[0.18em] text-cyan-200 hover:text-white hover:border-cyan-400/50 transition-all"
                    onClick={requestSharedRuntimeCacheRefresh}
                    title="Force refresh shared cache and rebuild RTDB payload"
                >
                    CACHE REFRESH
                    <span className="ml-2 text-text-dim">
                        {sharedRuntimeCache.status === 'loading' ? 'SYNCING' : 'FORCE'}
                    </span>
                </button>

                <div className="glass-panel godseye-view-controls mt-1 px-2.5 py-2 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3 text-[9px] tracking-[0.18em] uppercase text-text-dim">
                        <span>View</span>
                        <button
                            onClick={toggleGlobeViewMode}
                            className="godseye-view-toggle"
                            title="Switch between 3D planet and flat map mode"
                        >
                            <span className={`godseye-view-toggle__pill ${globeViewMode === 'planet' ? 'is-active' : ''}`}>Planet</span>
                            <span className={`godseye-view-toggle__pill ${globeViewMode === 'map' ? 'is-active' : ''}`}>Map</span>
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}
