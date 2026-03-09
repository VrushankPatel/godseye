import React from 'react';
import useStore from '../store/useStore';

export default function Inspector() {
    const inspector = useStore((s) => s.inspector);
    const clearInspector = useStore((s) => s.clearInspector);

    if (!inspector) return null;

    const data = inspector.data || {};
    const entries = Object.entries(data).filter(
        ([key]) => !key.startsWith('_') && key !== 'satrec'
    );

    return (
        <div className="inspector-panel">
            <div className="inspector-header">
                <div className="inspector-title">
                    {inspector.type?.toUpperCase() || 'INTEL'} // {inspector.name || 'UNKNOWN'}
                </div>
                <button className="inspector-close" onClick={clearInspector}>
                    ✕
                </button>
            </div>

            {/* Position */}
            {inspector.position && (
                <>
                    <div className="inspector-row">
                        <span className="inspector-label">LAT</span>
                        <span className="inspector-value">
                            {typeof inspector.position.lat === 'number'
                                ? inspector.position.lat.toFixed(4)
                                : inspector.position.lat}
                        </span>
                    </div>
                    <div className="inspector-row">
                        <span className="inspector-label">LNG</span>
                        <span className="inspector-value">
                            {typeof inspector.position.lng === 'number'
                                ? inspector.position.lng.toFixed(4)
                                : inspector.position.lng}
                        </span>
                    </div>
                </>
            )}

            {/* All data fields */}
            {entries.map(([key, value]) => {
                if (typeof value === 'object') return null;
                return (
                    <div className="inspector-row" key={key}>
                        <span className="inspector-label">{key.replace(/_/g, ' ')}</span>
                        <span className="inspector-value">{String(value)}</span>
                    </div>
                );
            })}

            {/* Video embed for CCTV */}
            {data.videoUrl && data.mediaType === 'embed' && (
                <iframe
                    className="inspector-video"
                    src={data.videoUrl}
                    title={inspector.name}
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    frameBorder="0"
                />
            )}
        </div>
    );
}
