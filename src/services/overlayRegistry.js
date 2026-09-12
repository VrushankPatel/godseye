/**
 * Zero-lag shared overlay registry.
 * Decouples high-frequency 60 FPS vehicle motion and CCTV camera positions
 * from React state, enabling direct Canvas2D overlay rendering synchronized with Cesium postRender.
 */
class OverlayRegistry {
    constructor() {
        this.vehicles = [];
        this.cameras = [];
        this.trafficActive = false;
        this.cctvActive = false;
    }

    setVehicles(vehicles) {
        this.vehicles = Array.isArray(vehicles) ? vehicles : [];
    }

    getVehicles() {
        return this.vehicles;
    }

    setCameras(cameras) {
        this.cameras = Array.isArray(cameras) ? cameras : [];
    }

    getCameras() {
        return this.cameras;
    }

    setTrafficActive(active) {
        this.trafficActive = Boolean(active);
    }

    isTrafficActive() {
        return this.trafficActive;
    }

    setCctvActive(active) {
        this.cctvActive = Boolean(active);
    }

    isCctvActive() {
        return this.cctvActive;
    }

    clear() {
        this.vehicles = [];
        this.cameras = [];
        this.trafficActive = false;
        this.cctvActive = false;
    }
}

export const overlayRegistry = new OverlayRegistry();
export default overlayRegistry;
