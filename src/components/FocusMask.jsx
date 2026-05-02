import React from 'react';
import useStore from '../store/useStore';

export default function FocusMask() {
    const focusMode = useStore((s) => s.focusMode);
    const focusHideEntities = useStore((s) => s.focusHideEntities);
    const uiLayoutMode = useStore((s) => s.uiLayoutMode);

    if (!focusMode) return null;

    return (
        <>
            <div
                className={`focus-mask-shell absolute inset-0 pointer-events-none z-[6] ${uiLayoutMode === 'partitioned' ? 'focus-mask-shell--partitioned' : ''}`}
                style={{
                    background: uiLayoutMode === 'partitioned'
                        ? 'radial-gradient(circle at var(--ops-focus-x) var(--ops-focus-y), rgba(0,0,0,0) 0%, rgba(0,0,0,0) 17%, rgba(2,4,10,0.72) 31%, rgba(2,4,10,0.9) 100%)'
                        : 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 17%, rgba(2,4,10,0.72) 31%, rgba(2,4,10,0.9) 100%)',
                }}
            />
            <div className={`focus-mask-banner absolute pointer-events-none z-[11] px-3 py-1 border border-neon-cyan/35 bg-black/65 text-[10px] tracking-[0.2em] text-neon-cyan ${uiLayoutMode === 'partitioned' ? 'focus-mask-banner--partitioned' : ''}`}>
                FOCUS MODE {focusHideEntities ? '// TARGET ONLY' : '// WIDE SCAN'}
            </div>
        </>
    );
}
