import React from 'react';
import useStore from '../store/useStore';

export default function TopBar() {
    const getActiveFeedCount = useStore((s) => s.getActiveFeedCount);
    const getTotalEntityCount = useStore((s) => s.getTotalEntityCount);

    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

    return (
        <div className="top-bar">
            <div className="top-bar-left">
                <div className="classification-banner">TOP SECRET // NOFORN</div>
                <div className="top-bar-brand">GODSEYE</div>
                <div className="top-bar-stat">FOCUS MODE // HIDE CTRL</div>
            </div>
            <div className="top-bar-right">
                <div className="top-bar-stat">
                    REL <span>{timestamp}</span>
                </div>
                <div className="top-bar-stat">
                    FEEDS: <span>{getActiveFeedCount()}</span>
                </div>
                <div className="top-bar-stat">
                    ENTITIES: <span>{getTotalEntityCount()}</span>
                </div>
            </div>
        </div>
    );
}
