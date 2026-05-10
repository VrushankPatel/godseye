/**
 * Globe-specific constants and configurations
 */

import * as Cesium from 'cesium';

export const MIN_CAMERA_HEIGHT_M = 45;
export const MAX_CAMERA_HEIGHT_M = 120000000;
export const AUTO_RECENTER_HEIGHT_M = 6000000;
export const AUTO_RECENTER_MIN_INTERVAL_MS = 1500;
export const ZOOM_SNAP_PITCH_THRESHOLD_RAD = Cesium.Math.toRadians(-72);
export const LABEL_COUNTRY_MIN_HEIGHT_M = 2200000;
export const LABEL_CITY_MAX_HEIGHT_M = 5200000;
export const CITY_3D_ENABLE_HEIGHT_M = 2800000;
export const CITY_3D_DISABLE_HEIGHT_M = 3600000;
export const GOD_MODE_REBALANCE_INTERVAL_MS = 900;

export const AIRCRAFT_MODEL_URI = '/models/Cesium_Air.glb';
export const TRACKED_AIRCRAFT_MODEL_HEADING_OFFSET_DEG = 0;

export const AIRCRAFT_TRACK_VIEWS = {
    CHASE: new Cesium.Cartesian3(2200, 0, 700),
    TOP: new Cesium.Cartesian3(0, 0, 4200),
    SIDE: new Cesium.Cartesian3(0, -2400, 700),
    CINEMATIC: new Cesium.Cartesian3(4200, -1800, 1300),
};

export const SATELLITE_TRACK_VIEWS = {
    ORBIT: new Cesium.Cartesian3(-32000, 0, 11000),
    NADIR: new Cesium.Cartesian3(0, 0, 36000),
    WIDE: new Cesium.Cartesian3(-60000, 22000, 20000),
};

export function getGodModeLayerBudgets(cameraHeightM) {
    if (cameraHeightM > 9000000) {
        return {
            aircraft: 1400,
            satellites: 1800,
            cctv: 700,
            traffic: 320,
            airports: 800,
            seismicStations: 550,
            maritime: 650,
            militaryBases: 450,
            metar: 420,
            weather: 700,
            airQuality: 450,
            oceanBuoys: 350,
        };
    }

    if (cameraHeightM > 3000000) {
        return {
            aircraft: 2600,
            satellites: 3200,
            cctv: 1100,
            traffic: 500,
            airports: 1300,
            seismicStations: 900,
            maritime: 900,
            militaryBases: 700,
            metar: 700,
            weather: 1000,
            airQuality: 700,
            oceanBuoys: 500,
        };
    }

    return {
        aircraft: 4200,
        satellites: 4800,
        cctv: 1700,
        traffic: 700,
        airports: 1900,
        seismicStations: 1200,
        maritime: 1300,
        militaryBases: 950,
        metar: 1000,
        weather: 1400,
        airQuality: 1000,
        oceanBuoys: 700,
    };
}