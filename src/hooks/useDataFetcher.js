import { useEffect, useRef, useCallback } from 'react';

/**
 * Generic polling hook that fetches a URL at a given interval.
 * Handles errors gracefully and cancels on unmount.
 */
export function useDataFetcher(url, interval, enabled, onData, onError) {
    const timerRef = useRef(null);
    const mountedRef = useRef(true);

    const fetchData = useCallback(async () => {
        if (!enabled || !mountedRef.current) return;
        try {
            const response = await fetch(url, {
                signal: AbortSignal.timeout(10000),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (mountedRef.current) {
                onData(data);
            }
        } catch (err) {
            if (mountedRef.current && onError) {
                onError(err);
            }
        }
    }, [url, enabled, onData, onError]);

    useEffect(() => {
        mountedRef.current = true;
        if (!enabled) {
            clearInterval(timerRef.current);
            return;
        }

        // Fetch immediately
        fetchData();

        // Then poll
        timerRef.current = setInterval(fetchData, interval);

        return () => {
            mountedRef.current = false;
            clearInterval(timerRef.current);
        };
    }, [fetchData, interval, enabled]);
}

/**
 * Fetch text data (for TLE files)
 */
export function useTextFetcher(url, enabled, onData, onError) {
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        if (!enabled) return;

        const fetchTLE = async () => {
            try {
                const response = await fetch(url, {
                    signal: AbortSignal.timeout(15000),
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const text = await response.text();
                if (mountedRef.current) {
                    onData(text);
                }
            } catch (err) {
                if (mountedRef.current && onError) {
                    onError(err);
                }
            }
        };

        fetchTLE();

        return () => {
            mountedRef.current = false;
        };
    }, [url, enabled, onData, onError]);
}
