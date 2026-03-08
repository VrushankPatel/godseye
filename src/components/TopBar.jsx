import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';

export default function TopBar() {
    const [time, setTime] = useState(new Date());
    const activeFeedCount = useStore((s) => s.getActiveFeedCount());
    const totalEntityCount = useStore((s) => s.getTotalEntityCount());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatUTC = (date) => {
        return date.toISOString().replace('T', ' ').substring(0, 19) + 'Z';
    };

    return (
        <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none z-10 flex justify-between items-start p-4">

            {/* Left: Branding & Classification */}
            <div className="flex flex-col gap-1 pointer-events-auto animate-slide-left">
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-neon-green/80 shadow-[0_0_10px_rgba(0,255,65,0.8)] animate-pulse" />
                    <h1 className="text-2xl font-bold tracking-[0.3em] text-white" style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>
                        WORLDVIEW
                    </h1>
                </div>
                <div className="text-[10px] tracking-widest text-text-dim uppercase font-semibold">
                    NO PLACE LEFT BEHIND
                </div>
            </div>

            {/* Top Center: Classification Banner */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-neon-red/10 border border-neon-red/30 px-8 py-1 rounded-b text-[10px] tracking-[0.2em] text-neon-red font-bold uppercase backdrop-blur-md hidden md:block">
                TOP SECRET // SI-TK // NOFORN
            </div>

            {/* Right: Time & Telemetry */}
            <div className="flex flex-col items-end gap-1 pointer-events-auto animate-slide-right">
                <div className="flex items-center gap-2 text-neon-amber text-sm tracking-wider font-semibold">
                    <span className="w-2 h-2 rounded-full bg-neon-red animate-pulse" />
                    REC {formatUTC(time)}
                </div>

                <div className="glass-panel px-3 py-1.5 mt-2 flex gap-4 text-xs tracking-wider text-text-dim">
                    <div>
                        FEEDS <span className="text-white ml-1">{activeFeedCount}</span>
                    </div>
                    <div className="w-[1px] h-4 bg-white/20" />
                    <div>
                        ENTITIES <span className="text-white ml-1">{totalEntityCount.toLocaleString()}</span>
                    </div>
                </div>
            </div>

        </div>
    );
}
