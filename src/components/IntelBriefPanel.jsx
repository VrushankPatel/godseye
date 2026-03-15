import React, { useMemo } from 'react';
import useStore from '../store/useStore';
import { INTEL_REGIONS, buildLocalIntelBrief } from '../services/intelMonitor';

function relativeTime(timestampMs) {
    if (!timestampMs) return 'now';
    const diff = Date.now() - timestampMs;
    if (diff < 60_000) return 'now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function IntelBriefPanel({ onHide = null }) {
    const items = useStore((s) => s.intelFeedItems);
    const status = useStore((s) => s.intelFeedStatus);
    const lastUpdatedAt = useStore((s) => s.intelFeedLastUpdatedAt);
    const intelRegion = useStore((s) => s.intelRegion);
    const layers = useStore((s) => s.layers);

    const brief = useMemo(
        () => buildLocalIntelBrief(items, layers, intelRegion),
        [intelRegion, items, layers]
    );

    const regionLabel = useMemo(
        () => INTEL_REGIONS.find((region) => region.id === intelRegion)?.label || 'ALL',
        [intelRegion]
    );

    return (
        <div className="rcp-section">
            <div className="rcp-header">
                <span>LOCAL INTEL BRIEF</span>
                <div className="flex items-center gap-2">
                    <span className="rcp-level-badge rcp-level-badge--watch">LOCAL</span>
                    <span className="text-text-dim">{relativeTime(lastUpdatedAt)}</span>
                    {onHide && (
                        <button onClick={onHide} className="rcp-action" title="Hide local intel brief">
                            ✕
                        </button>
                    )}
                </div>
            </div>

            <div className="rcp-brief-block">
                <div className="rcp-brief-scope">
                    <span>{regionLabel}</span>
                    <span>{brief.confidence} CONF</span>
                </div>

                <div className="rcp-brief-copy">
                    {status === 'loading' && !items.length
                        ? 'Synthesizing a local brief from live public feeds.'
                        : brief.summary}
                </div>

                <div className="rcp-brief-list">
                    {brief.bullets.map((item) => (
                        <div key={item} className="rcp-brief-item">
                            <span className="rcp-brief-dot" />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>

                {brief.domainSummary?.length > 0 && (
                    <div className="rcp-keyword-row">
                        {brief.domainSummary.map((domain) => (
                            <span key={domain} className="rcp-keyword-chip">
                                {domain}
                            </span>
                        ))}
                    </div>
                )}

                {brief.sources?.length > 0 && (
                    <div className="rcp-source-grid">
                        {brief.sources.map((source) => (
                            <div key={source.label} className="rcp-source-chip">
                                <span>{source.label}</span>
                                <span>{source.count}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
