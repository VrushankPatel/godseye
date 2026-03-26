import { useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import {
    getSharedCacheSections,
    hydrateSharedRuntimeCache,
} from '../services/sharedRuntimeCache';

let inFlightHydration = null;

export default function SharedRuntimeCacheBootstrap() {
    const setSharedRuntimeCacheSnapshot = useStore((s) => s.setSharedRuntimeCacheSnapshot);
    const setIntelFeedSnapshot = useStore((s) => s.setIntelFeedSnapshot);
    const forceRefreshToken = useStore((s) => s.sharedRuntimeCache.forceRefreshToken);
    const loadRef = useRef(0);

    useEffect(() => {
        let cancelled = false;
        const loadId = Date.now();
        loadRef.current = loadId;

        const hydrate = async () => {
            setSharedRuntimeCacheSnapshot({
                status: 'loading',
                source: 'bootstrap',
                error: null,
            });

            const forceRefresh = Boolean(forceRefreshToken);
            if (!inFlightHydration || forceRefresh) {
                inFlightHydration = hydrateSharedRuntimeCache({ forceRefresh })
                    .finally(() => {
                        inFlightHydration = null;
                    });
            }
            const result = await inFlightHydration;
            if (cancelled || loadRef.current !== loadId) return;

            const sections = getSharedCacheSections(result.payload);
            setSharedRuntimeCacheSnapshot({
                status: result.status,
                source: result.source,
                timestamp: result.timestamp,
                loadedAt: Date.now(),
                integrity: result.integrity,
                data: sections,
                error: result.error || null,
            });

            if (sections.intelWire?.items?.length) {
                setIntelFeedSnapshot({
                    items: sections.intelWire.items,
                    status: 'active',
                    lastUpdatedAt: result.timestamp,
                });
                console.log('[GodseyeCache] populating the data');
                console.log('[GodseyeCache] Data populated');
            }
        };

        hydrate().catch((error) => {
            if (cancelled || loadRef.current !== loadId) return;
            console.error('[GodseyeCache] Shared runtime cache bootstrap failed', error);
            setSharedRuntimeCacheSnapshot({
                status: 'error',
                source: 'bootstrap',
                loadedAt: Date.now(),
                integrity: 'error',
                error: error.message,
            });
        });

        return () => {
            cancelled = true;
        };
    }, [forceRefreshToken, setIntelFeedSnapshot, setSharedRuntimeCacheSnapshot]);

    return null;
}
