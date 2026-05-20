import React from 'react';
import useStore from '../store/useStore';

export default function FocusMask() {
    const focusMode = useStore((s) => s.focusMode);
    const focusHideEntities = useStore((s) => s.focusHideEntities);

    if (!focusMode) return null;

    return (
        <>
            <div
                className="focus-mask-shell absolute inset-0 pointer-events-none z-[6]"
                style={{
                    background: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 17%, rgba(2,4,10,0.72) 31%, rgba(2,4,10,0.9) 100%)',
                }}
            />
            <div className="focus-mask-banner absolute pointer-events-none z-[11] px-3 py-1 border border-neon-cyan/35 bg-black/65 text-[10px] tracking-[0.2em] text-neon-cyan">
                FOCUS MODE {focusHideEntities ? '// TARGET ONLY' : '// WIDE SCAN'}
            </div>
        </>
    );
}
