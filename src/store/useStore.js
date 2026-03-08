import { create } from 'zustand';

const useStore = create((set, get) => ({
    // Shader mode
    activeShader: 'DEFAULT',
    setShader: (mode) => set({ activeShader: mode }),

    // Layers
    layers: {
        aircraft: { enabled: false, data: [], count: 0, status: 'idle' },
        satellites: { enabled: false, data: [], count: 0, status: 'idle' },
        seismic: { enabled: false, data: [], count: 0, status: 'idle' },
        cctv: { enabled: false, data: [], count: 0, status: 'idle' },
        traffic: { enabled: false, data: [], count: 0, status: 'idle' },
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

    // Track target state (aircraft / satellite)
    trackedTarget: null,
    setTrackedTarget: (target) => set({ trackedTarget: target }),
    clearTrackedTarget: () => set({ trackedTarget: null }),
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
