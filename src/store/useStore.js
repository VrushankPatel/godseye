import { create } from 'zustand';
import { SURVEILLANCE_PRIMARY_LAYERS } from '../constants/dataSources';

const useStore = create((set, get) => ({
    // Shader mode
    activeShader: 'DEFAULT',
    setShader: (mode) => set({ activeShader: mode }),

    // Layers
    layers: {
        aircraft: { enabled: false, data: [], count: 0, status: 'idle' },
        satellites: { enabled: false, data: [], count: 0, status: 'idle' },
        seismic: { enabled: false, data: [], count: 0, status: 'idle' },
        airports: { enabled: false, data: [], count: 0, status: 'idle' },
        seismicStations: { enabled: false, data: [], count: 0, status: 'idle' },
        maritime: { enabled: false, data: [], count: 0, status: 'idle' },
        powerGrid: { enabled: false, data: [], count: 0, status: 'idle' },
        hazards: { enabled: false, data: [], count: 0, status: 'idle' },
        disasters: { enabled: false, data: [], count: 0, status: 'idle' },
        conflicts: { enabled: false, data: [], count: 0, status: 'idle' },
        weatherAlerts: { enabled: false, data: [], count: 0, status: 'idle' },
        oceanBuoys: { enabled: false, data: [], count: 0, status: 'idle' },
        volcanoes: { enabled: false, data: [], count: 0, status: 'idle' },
        spaceWeather: { enabled: false, data: [], count: 0, status: 'idle' },
        metar: { enabled: false, data: [], count: 0, status: 'idle' },
        fireHotspots: { enabled: false, data: [], count: 0, status: 'idle' },
        aviationHazards: { enabled: false, data: [], count: 0, status: 'idle' },
        solarFlares: { enabled: false, data: [], count: 0, status: 'idle' },
        weather: { enabled: false, data: [], count: 0, status: 'idle' },
        airQuality: { enabled: false, data: [], count: 0, status: 'idle' },
        cctv: { enabled: false, data: [], count: 0, status: 'idle' },
        traffic: { enabled: false, data: [], count: 0, status: 'idle' },
        militaryActivity: { enabled: false, data: [], count: 0, status: 'idle' },
        militaryBases: { enabled: false, data: [], count: 0, status: 'idle' },
        forbiddenZones: { enabled: false, data: [], count: 0, status: 'idle' },
        airspace: { enabled: false, data: [], count: 0, status: 'idle' },
    },

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

    updateLayerData: (layerName, data) =>
        set((state) => ({
            layers: {
                ...state.layers,
                [layerName]: {
                    ...state.layers[layerName],
                    data: data,
                    count: Array.isArray(data) ? data.length : 0,
                    status: 'active',
                },
            },
        })),

    setLayerStatus: (layerName, status) =>
        set((state) => ({
            layers: {
                ...state.layers,
                [layerName]: {
                    ...state.layers[layerName],
                    status: status,
                },
            },
        })),

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

    // Layer panel collapsed state
    layerPanelOpen: true,
    toggleLayerPanel: () => set((state) => ({ layerPanelOpen: !state.layerPanelOpen })),

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
