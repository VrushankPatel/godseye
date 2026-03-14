import React, { useEffect, useMemo, useState } from 'react';
import useStore from '../store/useStore';
import {
    INTEL_REGIONS,
    buildStrategicPosture,
    filterIntelByMonitors,
    matchesIntelRegion,
} from '../services/intelMonitor';

const MONITOR_STORAGE_KEY = 'godseye:intel-monitors:v1';
const DEFAULT_MONITORS = ['iran', 'hormuz', 'drone'];

function relativeTime(timestampMs) {
    if (!timestampMs) return 'now';
    const diff = Date.now() - timestampMs;
    if (diff < 60_000) return 'now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
}

function uniqueMonitorTerms(values) {
    return Array.from(
        new Set(
            (values || [])
                .map((value) => String(value || '').trim().toLowerCase())
                .filter(Boolean)
        )
    ).slice(0, 8);
}

export default function StrategicIntelPanel() {
    const items = useStore((s) => s.intelFeedItems);
    const status = useStore((s) => s.intelFeedStatus);
    const lastUpdatedAt = useStore((s) => s.intelFeedLastUpdatedAt);
    const intelRegion = useStore((s) => s.intelRegion);
    const layers = useStore((s) => s.layers);
    const [monitorInput, setMonitorInput] = useState('');
    const [monitors, setMonitors] = useState(DEFAULT_MONITORS);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(MONITOR_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return;
            const next = uniqueMonitorTerms(parsed);
            if (next.length) setMonitors(next);
        } catch (err) {
            // Ignore corrupted local monitor state.
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(MONITOR_STORAGE_KEY, JSON.stringify(monitors));
        } catch (err) {
            // Ignore quota/storage errors.
        }
    }, [monitors]);

    const posture = useMemo(
        () => buildStrategicPosture(items, layers, intelRegion),
        [intelRegion, items, layers]
    );

    const scopedItems = useMemo(
        () => items.filter((item) => matchesIntelRegion(item, intelRegion)).slice(0, 4),
        [intelRegion, items]
    );

    const monitorMatches = useMemo(
        () => filterIntelByMonitors(items, monitors, intelRegion).slice(0, 4),
        [intelRegion, items, monitors]
    );

    const regionLabel = useMemo(() => {
        return INTEL_REGIONS.find((region) => region.id === intelRegion)?.label || 'ALL';
    }, [intelRegion]);

    const addMonitor = () => {
        const next = uniqueMonitorTerms([...monitors, monitorInput]);
        setMonitors(next);
        setMonitorInput('');
    };

    const removeMonitor = (value) => {
        setMonitors((current) => current.filter((item) => item !== value));
    };

    return (
        <>
            <div className="rcp-section">
                <div className="rcp-header">
                    <span>THEATER POSTURE</span>
                    <div className="flex items-center gap-2">
                        <span className="text-text-dim">{relativeTime(lastUpdatedAt)}</span>
                        <span className={`rcp-level-badge rcp-level-badge--${posture.level.toLowerCase()}`}>
                            {posture.level}
                        </span>
                    </div>
                </div>

                <div className="rcp-stats-grid">
                    <div className="rcp-stat-row">
                        <span className="rcp-stat-label">{regionLabel} RISK</span>
                        <span className={`rcp-stat-value ${posture.level !== 'STABLE' ? 'is-active' : ''}`}>
                            {posture.score}
                        </span>
                    </div>
                    <div className="rcp-stat-row">
                        <span className="rcp-stat-label">AIR SIGNALS</span>
                        <span className="rcp-stat-value">{posture.signals.air}</span>
                    </div>
                    <div className="rcp-stat-row">
                        <span className="rcp-stat-label">SEA SIGNALS</span>
                        <span className="rcp-stat-value">{posture.signals.sea}</span>
                    </div>
                    <div className="rcp-stat-row">
                        <span className="rcp-stat-label">GROUND SIGNALS</span>
                        <span className="rcp-stat-value">{posture.signals.ground}</span>
                    </div>
                    <div className="rcp-stat-row">
                        <span className="rcp-stat-label">HEADLINE FLOW</span>
                        <span className="rcp-stat-value">{posture.headlineCount}</span>
                    </div>
                </div>

                <div className="rcp-brief-copy">
                    {status === 'loading' && !items.length
                        ? 'Acquiring live conflict intelligence.'
                        : posture.level === 'CRITICAL'
                            ? `Escalation posture is critical for ${regionLabel}. Military and conflict indicators are converging.`
                            : posture.level === 'ELEVATED'
                                ? `Elevated surveillance posture in ${regionLabel}. Multiple streams are showing sustained pressure.`
                                : posture.level === 'WATCH'
                                    ? `Watch posture active in ${regionLabel}. Activity is present but not yet clustering into a critical spike.`
                                    : `Signal picture is stable for ${regionLabel}. Continue passive monitoring.`}
                </div>

                {posture.trending.length > 0 && (
                    <div className="rcp-keyword-row">
                        {posture.trending.map((item) => (
                            <span key={item.label} className="rcp-keyword-chip">
                                {item.label} <span>{item.count}</span>
                            </span>
                        ))}
                    </div>
                )}

                {scopedItems.length > 0 && (
                    <div className="rcp-feed-list">
                        {scopedItems.map((item) => (
                            <a
                                key={item.id}
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rcp-feed-item"
                            >
                                <div className="rcp-feed-source">
                                    <span>{item.source}</span>
                                    <span>{relativeTime(item.publishedAt)}</span>
                                </div>
                                <div className="rcp-feed-title">{item.title}</div>
                            </a>
                        ))}
                    </div>
                )}
            </div>

            <div className="rcp-section">
                <div className="rcp-header">
                    <span>KEYWORD MONITORS</span>
                    <span className="text-text-dim">{monitorMatches.length}</span>
                </div>

                <div className="px-2 py-2">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={monitorInput}
                            onChange={(event) => setMonitorInput(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') addMonitor();
                            }}
                            placeholder="Add watch term"
                            className="rcp-search"
                        />
                        <button onClick={addMonitor} className="rcp-action">
                            ADD
                        </button>
                    </div>
                </div>

                <div className="rcp-monitor-row">
                    {monitors.map((item) => (
                        <button
                            key={item}
                            className="rcp-monitor-chip"
                            onClick={() => removeMonitor(item)}
                            title={`Remove ${item}`}
                        >
                            {item}
                        </button>
                    ))}
                </div>

                {monitorMatches.length > 0 ? (
                    <div className="rcp-feed-list">
                        {monitorMatches.map((item) => (
                            <a
                                key={`${item.id}-monitor`}
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rcp-feed-item"
                            >
                                <div className="rcp-feed-source">
                                    <span>{item.source}</span>
                                    <span>{relativeTime(item.publishedAt)}</span>
                                </div>
                                <div className="rcp-feed-title">{item.title}</div>
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className="rcp-snapshot-empty">
                        {status === 'loading' ? 'SCANNING MONITORS' : 'NO MONITOR MATCHES'}
                    </div>
                )}
            </div>
        </>
    );
}
