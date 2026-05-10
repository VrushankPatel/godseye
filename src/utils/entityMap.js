/**
 * Entity ID mapping utilities for Globe component
 */

export const ENTITY_ID_PREFIX_LAYER_MAP = [
    ['aircraft-', 'aircraft'],
    ['satellite-', 'satellites'],
    ['seismic-', 'seismic'],
    ['airport-', 'airports'],
    ['seismic-station-', 'seismicStations'],
    ['maritime-port-', 'maritime'],
    ['maritime-vessel-', 'maritime'],
    ['grid-outage-', 'powerGrid'],
    ['power-plant-', 'powerGrid'],
    ['hazard-', 'hazards'],
    ['disaster-', 'disasters'],
    ['conflict-', 'conflicts'],
    ['ocean-buoy-', 'oceanBuoys'],
    ['volcano-', 'volcanoes'],
    ['spacewx-', 'spaceWeather'],
    ['metar-', 'metar'],
    ['fire-', 'fireHotspots'],
    ['airsigmet-', 'aviationHazards'],
    ['sigmet-', 'aviationHazards'],
    ['solar-flare-', 'solarFlares'],
    ['weather-', 'weather'],
    ['air-quality-', 'airQuality'],
    ['cctv-', 'cctv'],
    ['traffic-', 'traffic'],
    ['mil-activity-', 'militaryActivity'],
    ['mil-base-', 'militaryBases'],
    ['forbidden-zone-', 'forbiddenZones'],
    ['airspace-', 'airspace'],
];

export function inferLayerTypeFromEntityId(entityId = '') {
    const id = String(entityId);
    for (const [prefix, layerType] of ENTITY_ID_PREFIX_LAYER_MAP) {
        if (id.startsWith(prefix)) return layerType;
    }
    return 'unknown';
}

export function getTrackViewOffset(type, view) {
    // Dynamic import pattern to avoid Cesium initialization issues in tests
    const { AIRCRAFT_TRACK_VIEWS, SATELLITE_TRACK_VIEWS } = require('./globe');
    if (type === 'satellites') {
        return SATELLITE_TRACK_VIEWS[view] || SATELLITE_TRACK_VIEWS.ORBIT;
    }
    return AIRCRAFT_TRACK_VIEWS[view] || AIRCRAFT_TRACK_VIEWS.CHASE;
}