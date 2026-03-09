import React, { useEffect, useRef, useState } from 'react';
import useStore from '../store/useStore';

const MAX_LOG_LINES = 50;

const BOOT_MESSAGES = [
    '[+] Establishing secure connection to orbital relay...',
    '[+] Connection established. Handshake verified.',
    '[+] Initializing GODSEYE surveillance matrix...',
    '[+] Loading geospatial intelligence modules...',
    '[*] Globe renderer: THREE.js / Globe.GL active',
    '[+] All subsystems nominal. Awaiting operator input.',
];

export default function SysLog() {
    const [lines, setLines] = useState([]);
    const scrollRef = useRef(null);
    const layers = useStore((s) => s.layers);

    // Boot sequence
    useEffect(() => {
        let i = 0;
        const timer = setInterval(() => {
            if (i < BOOT_MESSAGES.length) {
                const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
                setLines((prev) => [...prev.slice(-MAX_LOG_LINES), `[${ts}] ${BOOT_MESSAGES[i]}`]);
                i++;
            } else {
                clearInterval(timer);
            }
        }, 400);
        return () => clearInterval(timer);
    }, []);

    // Log layer state changes
    useEffect(() => {
        const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
        for (const [name, state] of Object.entries(layers)) {
            if (state.status === 'active' && state.count > 0) {
                setLines((prev) => {
                    const msg = `[${ts}] [FEED] ${name.toUpperCase()}: ${state.count} entities acquired`;
                    if (prev[prev.length - 1]?.includes(`[FEED] ${name.toUpperCase()}`)) return prev;
                    return [...prev.slice(-MAX_LOG_LINES), msg];
                });
            } else if (state.status === 'loading') {
                setLines((prev) => {
                    const msg = `[${ts}] [SYS] ${name.toUpperCase()}: Acquiring data feed...`;
                    if (prev[prev.length - 1]?.includes(`[SYS] ${name.toUpperCase()}`)) return prev;
                    return [...prev.slice(-MAX_LOG_LINES), msg];
                });
            }
        }
    }, [layers]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [lines]);

    return (
        <div className="sys-log">
            <div className="sys-log-header">&gt;_ SYS.LOG</div>
            <div className="sys-log-body" ref={scrollRef}>
                {lines.map((line, i) => (
                    <div key={i} className="sys-log-line">{line}</div>
                ))}
                <span className="sys-log-cursor">█</span>
            </div>
        </div>
    );
}
