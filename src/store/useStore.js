import { create } from 'zustand';
import { SURVEILLANCE_PRIMARY_LAYERS } from '../constants/dataSources';
import { createLayerMeta, mergeLayerMeta } from '../utils/layerHealth';

function createLayerState() {
    return {
        enabled: false,
        data: [],
        count: 0,
        status: 'idle',
        meta: createLayerMeta(),
    };
}

function createLayersState() {
    return {
        aircraft: createLayerState(),
        satellites: createLayerState(),
        seismic: createLayerState(),
        airports: createLayerState(),
        seismicStations: createLayerState(),
        maritime: createLayerState(),
        powerGrid: createLayerState(),
        hazards: createLayerState(),
        disasters: createLayerState(),
        conflicts: createLayerState(),
        weatherAlerts: createLayerState(),
        oceanBuoys: createLayerState(),
        volcanoes: createLayerState(),
        spaceWeather: createLayerState(),
        metar: createLayerState(),
        fireHotspots: createLayerState(),
        aviationHazards: createLayerState(),
        solarFlares: createLayerState(),
        weather: createLayerState(),
        airQuality: createLayerState(),
        cctv: createLayerState(),
        traffic: createLayerState(),
        militaryActivity: createLayerState(),
        militaryBases: createLayerState(),
        forbiddenZones: createLayerState(),
        airspace: createLayerState(),
    };
}

const useStore = create((set, get) => ({
    // Shader mode
    activeShader: 'DEFAULT',
    setShader: (mode) => set({ activeShader: mode }),

    // Layers
    layers: createLayersState(),

    toggleLayer: (layerName) =>
        set((state) => ({
            layers: {
                ...state.layers,
                [layerName]: {
                    ...state.layers[layerName],
                    enabled: !state.layers[layerName].enabled,
                },
            },
        })),

    enableAllLayers: () =>
        set((state) => {
            const newLayers = {};
            Object.keys(state.layers).forEach((key) => {
                newLayers[key] = { ...state.layers[key], enabled: true };
            });
            return { layers: newLayers };
        }),

    enableSurveillanceLayers: () =>
        set((state) => {
            const enabledSet = new Set(SURVEILLANCE_PRIMARY_LAYERS);
            const newLayers = {};
            Object.keys(state.layers).forEach((key) => {
                newLayers[key] = {
                    ...state.layers[key],
                    enabled: enabledSet.has(key),
                };
            });
            return { layers: newLayers };
        }),

    markLayerFetchStart: (layerName, metaPatch = {}) =>
        set((state) => {
            const currentLayer = state.layers[layerName];
            if (!currentLayer) return state;
            const now = Date.now();
            return {
                layers: {
                    ...state.layers,
                    [layerName]: {
                        ...currentLayer,
                        status: currentLayer.data?.length ? currentLayer.status : 'loading',
                        meta: mergeLayerMeta(
                            currentLayer.meta,
                            {
                                lastAttemptAt: now,
                                health: currentLayer.data?.length ? currentLayer.meta?.health || 'degraded' : 'loading',
                                errorCode: null,
                                ...metaPatch,
                            },
                            { now }
                        ),
                    },
                },
            };
        }),

    updateLayerData: (layerName, data, metaPatch = {}) =>
        set((state) => {
            const currentLayer = state.layers[layerName];
            if (!currentLayer) return state;
            const now = Date.now();
            const isCached = Boolean(metaPatch.isCached);
            const nextStatus = metaPatch.status || 'active';
            return {
                layers: {
                    ...state.layers,
                    [layerName]: {
                        ...currentLayer,
                        data,
                        count: Array.isArray(data) ? data.length : 0,
                        status: nextStatus,
                        meta: mergeLayerMeta(
                            currentLayer.meta,
                            {
                                lastAttemptAt: metaPatch.lastAttemptAt ?? currentLayer.meta?.lastAttemptAt ?? now,
                                lastSuccessAt: metaPatch.lastSuccessAt ?? now,
                                sourceName: metaPatch.sourceName ?? currentLayer.meta?.sourceName ?? '',
                                isCached,
                                health: metaPatch.health || (isCached ? 'cached' : 'live'),
                                errorCode: metaPatch.errorCode ?? null,
                            },
                            { now }
                        ),
                    },
                },
            };
        }),

    setLayerStatus: (layerName, status, metaPatch = {}) =>
        set((state) => {
            const currentLayer = state.layers[layerName];
            if (!currentLayer) return state;
            const now = Date.now();
            const statusHealthMap = {
                idle: 'idle',
                loading: 'loading',
                error: 'error',
                stale: 'stale',
                active: currentLayer.meta?.isCached ? 'cached' : 'live',
            };
            const impliedPatch = {
                ...metaPatch,
                lastAttemptAt: status === 'loading' ? now : metaPatch.lastAttemptAt,
                health: metaPatch.health || statusHealthMap[status] || currentLayer.meta?.health || 'idle',
                errorCode: status === 'error'
                    ? metaPatch.errorCode || currentLayer.meta?.errorCode || 'feed_unavailable'
                    : metaPatch.errorCode ?? null,
            };
            return {
                layers: {
                    ...state.layers,
                    [layerName]: {
                        ...currentLayer,
                        status,
                        meta: mergeLayerMeta(currentLayer.meta, impliedPatch, { now }),
                    },
                },
            };
        }),

    // Inspector
    inspector: null,
    setInspector: (obj) => set({ inspector: obj }),
    clearInspector: () => set({ inspector: null }),
    hoverInfo: null,
    setHoverInfo: (obj) => set({ hoverInfo: obj }),
    clearHoverInfo: () => set({ hoverInfo: null }),

    // Flight filters
    flightFilters: {
        passenger: true,
        cargo: true,
        military: true,
        private: true,
        unknown: true,
        airlineQuery: '',
    },
    setFlightFilter: (key, value) =>
        set((state) => ({
            flightFilters: {
                ...state.flightFilters,
                [key]: value,
            },
        })),
    setFlightAirlineQuery: (value) =>
        set((state) => ({
            flightFilters: {
                ...state.flightFilters,
                airlineQuery: value,
            },
        })),
    resetFlightFilters: () =>
        set(() => ({
            flightFilters: {
                passenger: true,
                cargo: true,
                military: true,
                private: true,
                unknown: true,
                airlineQuery: '',
            },
        })),

    // Raw aircraft feed data (used by dependent layers without forcing aircraft visuals on)
    aircraftFeedData: [],
    setAircraftFeedData: (data) =>
        set({
            aircraftFeedData: Array.isArray(data) ? data : [],
        }),

    // Manual live-layer refresh signals
    layerRefreshTokens: {
        aircraft: 0,
        satellites: 0,
    },
    requestLayerRefresh: (layerName) =>
        set((state) => ({
            layerRefreshTokens: {
                ...state.layerRefreshTokens,
                [layerName]: Date.now(),
            },
        })),

    // Track target state (aircraft / satellite)
    trackedTarget: null,
    setTrackedTarget: (target) => set({ trackedTarget: target }),
    clearTrackedTarget: () => set({ trackedTarget: null }),
    trackingView: 'CHASE',
    setTrackingView: (view) => set({ trackingView: view }),
    toggleTrackedTarget: (target) =>
        set((state) => {
            if (
                state.trackedTarget &&
                state.trackedTarget.entityId === target.entityId
            ) {
                return { trackedTarget: null };
            }
            return { trackedTarget: target };
        }),

    // Globe state
    isAutoRotating: true,
    setAutoRotating: (val) => set({ isAutoRotating: val }),
    focusMode: false,
    toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
    setFocusMode: (value) => set({ focusMode: Boolean(value) }),
    focusHideEntities: false,
    setFocusHideEntities: (value) => set({ focusHideEntities: Boolean(value) }),

    // Cesium viewer reference
    viewerRef: null,
    setViewerRef: (ref) => set({ viewerRef: ref }),
    city3DActive: false,
    setCity3DActive: (value) => set({ city3DActive: Boolean(value) }),
    appIsActive: true,
    setAppIsActive: (value) => set({ appIsActive: Boolean(value) }),

    // Layer panel collapsed state
    layerPanelOpen: true,
    toggleLayerPanel: () => set((state) => ({ layerPanelOpen: !state.layerPanelOpen })),

    // Panel visibility toggles
    missionHudVisible: true,
    toggleMissionHud: () => set((state) => ({ missionHudVisible: !state.missionHudVisible })),
    sysTerminalVisible: true,
    toggleSysTerminal: () => set((state) => ({ sysTerminalVisible: !state.sysTerminalVisible })),
    citiesVisible: true,
    toggleCities: () => set((state) => ({ citiesVisible: !state.citiesVisible })),

    // Shared intelligence feed state
    intelFeedItems: [],
    intelFeedStatus: 'idle',
    intelFeedLastUpdatedAt: 0,
    intelRegion: 'all',
    setIntelFeedSnapshot: ({ items = [], status = 'idle', lastUpdatedAt = 0 }) =>
        set({
            intelFeedItems: Array.isArray(items) ? items : [],
            intelFeedStatus: status,
            intelFeedLastUpdatedAt: Number.isFinite(lastUpdatedAt) ? lastUpdatedAt : 0,
        }),
    setIntelRegion: (value) => set({ intelRegion: String(value || 'all') }),

    // Get total active feed count
    getActiveFeedCount: () => {
        const { layers } = get();
        return Object.values(layers).filter((l) => l.enabled && l.status === 'active').length;
    },

    // Get total entity count
    getTotalEntityCount: () => {
        const { layers } = get();
        return Object.values(layers).reduce((sum, l) => sum + (l.enabled ? l.count : 0), 0);
    },
}));

export default useStore;
