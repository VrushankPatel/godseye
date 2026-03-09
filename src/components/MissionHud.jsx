import React from 'react';
import useStore from '../store/useStore';

export default function MissionHud() {
    const layers = useStore((s) => s.layers);
    const getActiveFeedCount = useStore((s) => s.getActiveFeedCount);
    const getTotalEntityCount = useStore((s) => s.getTotalEntityCount);

    const activeFeeds = getActiveFeedCount();
    const totalEntities = getTotalEntityCount();
    const aircraftCount = layers.aircraft?.count || 0;
    const satCount = layers.satellites?.count || 0;

    // Don't show if inspector is open (it takes the right side)
    const inspector = useStore((s) => s.inspector);
    if (inspector) return null;

    return (
        <div className="mission-hud-right">
            <div className="hud-metric">
                <span>FEEDS</span>
                <span className="hud-metric-value">{activeFeeds}</span>
            </div>
            <div className="hud-metric">
                <span>ENTITIES</span>
                <span className="hud-metric-value">{totalEntities}</span>
            </div>
            <div className="hud-metric">
                <span>AIRCRAFT</span>
                <span className="hud-metric-value">{aircraftCount}</span>
            </div>
            <div className="hud-metric">
                <span>SATELLITES</span>
                <span className="hud-metric-value">{satCount}</span>
            </div>
        </div>
    );
}
