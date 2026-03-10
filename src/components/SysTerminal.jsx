import React, { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';

const BOOT_SEQUENCE = [
    { delay: 200, msg: '> GODSEYE v1.0 — SYSTEM BOOT INITIATED' },
    { delay: 400, msg: '> Establishing secure uplink...' },
    { delay: 600, msg: '> Encryption handshake COMPLETE' },
    { delay: 800, msg: '> Satellite constellation lock ACQUIRED' },
    { delay: 1000, msg: '> Deploying surveillance grid...' },
];

const LAYER_MESSAGES = {
    aircraft: { loading: '> INTERCEPTING ADS-B transponder signals...', active: count => `> ${count.toLocaleString()} aircraft targets LOCKED` },
    satellites: { loading: '> Acquiring orbital telemetry data...', active: count => `> ${count.toLocaleString()} satellites TRACKED — orbital grid ONLINE` },
    seismic: { loading: '> Tapping into seismograph network...', active: count => `> ${count.toLocaleString()} seismic events DETECTED` },
    airports: { loading: '> Mapping global airfield database...', active: count => `> ${count.toLocaleString()} airfields CATALOGUED` },
    seismicStations: { loading: '> Connecting to monitoring stations...', active: count => `> ${count.toLocaleString()} seismic stations ONLINE` },
    maritime: { loading: '> Scanning maritime AIS transponders...', active: count => `> ${count.toLocaleString()} vessels on SONAR` },
    powerGrid: { loading: '> Infiltrating power grid telemetry...', active: count => `> ${count.toLocaleString()} power nodes MAPPED` },
    cctv: { loading: '> DECRYPTING CCTV feed matrix...', active: count => `> ${count.toLocaleString()} surveillance cameras ONLINE` },
    traffic: { loading: '> Hijacking traffic sensor network...', active: count => `> ${count.toLocaleString()} traffic feeds CAPTURED` },
    conflicts: { loading: '> Scanning conflict zone intelligence...', active: count => `> ${count.toLocaleString()} conflict areas FLAGGED` },
    militaryActivity: { loading: '> Monitoring military comm channels...', active: count => `> ${count.toLocaleString()} military movements DETECTED` },
    militaryBases: { loading: '> Cross-referencing classified installations...', active: count => `> ${count.toLocaleString()} military sites IDENTIFIED` },
};

export default function SysTerminal() {
    const layers = useStore((s) => s.layers);
    const [lines, setLines] = useState([]);
    const scrollRef = useRef(null);
    const seenRef = useRef(new Set());

    // Boot sequence
    useEffect(() => {
        BOOT_SEQUENCE.forEach(({ delay, msg }) => {
            setTimeout(() => {
                setLines((prev) => [...prev.slice(-40), msg]);
            }, delay);
        });
    }, []);

    // Monitor layer status changes
    useEffect(() => {
        Object.entries(layers).forEach(([key, layer]) => {
            const msgs = LAYER_MESSAGES[key];
            if (!msgs) return;

            const loadKey = `${key}:loading`;
            const activeKey = `${key}:active:${layer.count}`;

            if (layer.status === 'loading' && !seenRef.current.has(loadKey)) {
                seenRef.current.add(loadKey);
                setLines((prev) => [...prev.slice(-40), msgs.loading]);
            }

            if (layer.status === 'active' && layer.count > 0 && !seenRef.current.has(activeKey)) {
                seenRef.current.add(activeKey);
                // Clear old active message for this key
                seenRef.current.forEach((k) => {
                    if (k.startsWith(`${key}:active:`) && k !== activeKey) {
                        seenRef.current.delete(k);
                    }
                });
                setLines((prev) => [...prev.slice(-40), msgs.active(layer.count)]);
            }
        });
    }, [layers]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [lines]);

    return (
        <div className="sys-terminal">
            <div className="sys-terminal-header">
                <span className="sys-terminal-dot"></span>
                SYS://OPS_TERMINAL
            </div>
            <div className="sys-terminal-body" ref={scrollRef}>
                {lines.map((line, i) => (
                    <div key={i} className={`sys-terminal-line ${i === lines.length - 1 ? 'sys-terminal-line--latest' : ''}`}>
                        {line}
                    </div>
                ))}
                <span className="sys-terminal-cursor">█</span>
            </div>
        </div>
    );
}
