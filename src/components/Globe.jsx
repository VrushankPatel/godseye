import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { DEFAULT_CAMERA } from '../constants/dataSources';
import AircraftLayer from '../layers/AircraftLayer';
import SatelliteLayer from '../layers/SatelliteLayer';
import SeismicLayer from '../layers/SeismicLayer';
import AirportsLayer from '../layers/AirportsLayer';
import SeismicStationsLayer from '../layers/SeismicStationsLayer';
import MaritimeLayer from '../layers/MaritimeLayer';
import PowerGridLayer from '../layers/PowerGridLayer';
import HazardsLayer from '../layers/HazardsLayer';
import DisasterLayer from '../layers/DisasterLayer';
import ConflictLayer from '../layers/ConflictLayer';
import OceanBuoysLayer from '../layers/OceanBuoysLayer';
import VolcanoesLayer from '../layers/VolcanoesLayer';
import SpaceWeatherLayer from '../layers/SpaceWeatherLayer';
import MetarLayer from '../layers/MetarLayer';
import FireHotspotsLayer from '../layers/FireHotspotsLayer';
import AviationHazardsLayer from '../layers/AviationHazardsLayer';
import SolarFlaresLayer from '../layers/SolarFlaresLayer';
import WeatherLayer from '../layers/WeatherLayer';
import AirQualityLayer from '../layers/AirQualityLayer';
import CameraLayer from '../layers/CameraLayer';
import AirspaceLayer from '../layers/AirspaceLayer';
import TrafficLayer from '../layers/TrafficLayer';
import MilitaryActivityLayer from '../layers/MilitaryActivityLayer';
import MilitaryBasesLayer from '../layers/MilitaryBasesLayer';
import ForbiddenZonesLayer from '../layers/ForbiddenZonesLayer';

const TRACK_SAMPLE_INTERVAL_MS = 1000;
const MAX_TRACK_POINTS = 220;
const MIN_TRACK_POINT_DISTANCE_METERS = 250;
const AIRCRAFT_MODEL_URI = '/models/Cesium_Air.glb';
const TRACKED_AIRCRAFT_MODEL_HEADING_OFFSET_DEG = 0;
const MIN_CAMERA_HEIGHT_M = 2500;
const MAX_CAMERA_HEIGHT_M = 23000000;
const AUTO_RECENTER_HEIGHT_M = 6000000;
const AUTO_RECENTER_MIN_INTERVAL_MS = 1500;
const ZOOM_SNAP_PITCH_THRESHOLD_RAD = Cesium.Math.toRadians(-72);
const LABEL_COUNTRY_MIN_HEIGHT_M = 2200000;
const LABEL_CITY_MAX_HEIGHT_M = 5200000;

const AIRCRAFT_TRACK_VIEWS = {
    CHASE: new Cesium.Cartesian3(2200, 0, 700),
    TOP: new Cesium.Cartesian3(0, 0, 4200),
    SIDE: new Cesium.Cartesian3(0, -2400, 700),
    CINEMATIC: new Cesium.Cartesian3(4200, -1800, 1300),
};

const SATELLITE_TRACK_VIEWS = {
    ORBIT: new Cesium.Cartesian3(-32000, 0, 11000),
    NADIR: new Cesium.Cartesian3(0, 0, 36000),
    WIDE: new Cesium.Cartesian3(-60000, 22000, 20000),
};

const ENTITY_ID_PREFIX_LAYER_MAP = [
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

function getTrackViewOffset(type, view) {
    if (type === 'satellites') {
        return SATELLITE_TRACK_VIEWS[view] || SATELLITE_TRACK_VIEWS.ORBIT;
    }
    return AIRCRAFT_TRACK_VIEWS[view] || AIRCRAFT_TRACK_VIEWS.CHASE;
}

function readNumericProperty(property, time) {
    if (property === undefined || property === null) return null;
    try {
        const value = typeof property.getValue === 'function' ? property.getValue(time) : property;
        return Number.isFinite(value) ? value : null;
    } catch (err) {
        return null;
    }
}

function getTrackedHeadingDegrees(entity, time) {
    if (!entity?.properties) return 0;

    const directHeading = readNumericProperty(entity.properties._headingDeg, time);
    if (Number.isFinite(directHeading)) return directHeading;

    try {
        const textHeading = typeof entity.properties.heading?.getValue === 'function'
            ? entity.properties.heading.getValue(time)
            : entity.properties.heading;
        const parsed = Number.parseFloat(String(textHeading || '0'));
        return Number.isFinite(parsed) ? parsed : 0;
    } catch (err) {
        return 0;
    }
}

function inferLayerTypeFromEntityId(entityId = '') {
    const id = String(entityId);
    for (const [prefix, layerType] of ENTITY_ID_PREFIX_LAYER_MAP) {
        if (id.startsWith(prefix)) return layerType;
    }
    return 'unknown';
}

export default function Globe() {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const trailEntityRef = useRef(null);
    const trailPositionsRef = useRef([]);
    const trailTimerRef = useRef(null);
    const trackedAircraftEntityIdRef = useRef(null);
    const hoveredEntityIdRef = useRef(null);
    const lastHoverUpdateMsRef = useRef(0);
    const labelLayersRef = useRef({ country: null, city: null });
    const cameraRecenterStateRef = useRef({ lastAppliedMs: 0 });
    const focusHiddenSnapshotRef = useRef(new Map());
    const [viewerReady, setViewerReady] = useState(false);
    const setViewerRefStore = useStore((s) => s.setViewerRef);
    const isAutoRotating = useStore((s) => s.isAutoRotating);
    const setAutoRotating = useStore((s) => s.setAutoRotating);
    const setInspector = useStore((s) => s.setInspector);
    const setHoverInfo = useStore((s) => s.setHoverInfo);
    const clearHoverInfo = useStore((s) => s.clearHoverInfo);
    const trackedTarget = useStore((s) => s.trackedTarget);
    const trackingView = useStore((s) => s.trackingView);
    const clearTrackedTarget = useStore((s) => s.clearTrackedTarget);
    const focusHideEntities = useStore((s) => s.focusHideEntities);

    const restoreTrackedAircraftVisual = useCallback(() => {
        const viewer = viewerRef.current;
        const trackedAircraftId = trackedAircraftEntityIdRef.current;
        trackedAircraftEntityIdRef.current = null;

        if (!viewer || viewer.isDestroyed() || !trackedAircraftId) return;
        const trackedEntity = viewer.entities.getById(trackedAircraftId);
        if (!trackedEntity) return;

        if (trackedEntity.billboard) {
            trackedEntity.billboard.show = true;
        }
        trackedEntity.model = undefined;
        trackedEntity.orientation = undefined;
    }, []);

    const applyTrackedAircraftVisual = useCallback((entity) => {
        if (!entity) return;

        if (
            trackedAircraftEntityIdRef.current &&
            trackedAircraftEntityIdRef.current !== entity.id
        ) {
            restoreTrackedAircraftVisual();
        }

        trackedAircraftEntityIdRef.current = entity.id;
        if (entity.billboard) {
            entity.billboard.show = false;
        }

        entity.model = {
            uri: AIRCRAFT_MODEL_URI,
            minimumPixelSize: 72,
            maximumScale: 140,
            incrementallyLoadTextures: true,
            silhouetteColor: Cesium.Color.fromCssColorString('#00b4ff').withAlpha(0.55),
            silhouetteSize: 1.2,
            disableDepthTestDistance: 9000000,
        };

        entity.orientation = new Cesium.CallbackProperty((time, result) => {
            const position = entity.position?.getValue
                ? entity.position.getValue(time)
                : entity.position;
            if (!position) return undefined;

            const headingDeg = getTrackedHeadingDegrees(entity, time);
            const headingRad = Cesium.Math.toRadians(
                headingDeg + TRACKED_AIRCRAFT_MODEL_HEADING_OFFSET_DEG
            );
            const hpr = new Cesium.HeadingPitchRoll(headingRad, 0, 0);
            return Cesium.Transforms.headingPitchRollQuaternion(position, hpr, Cesium.Ellipsoid.WGS84, undefined, result);
        }, false);
    }, [restoreTrackedAircraftVisual]);

    const removeTrail = useCallback(() => {
        clearInterval(trailTimerRef.current);
        trailTimerRef.current = null;
        trailPositionsRef.current = [];

        const viewer = viewerRef.current;
        if (viewer && !viewer.isDestroyed() && trailEntityRef.current) {
            viewer.entities.remove(trailEntityRef.current);
        }
        trailEntityRef.current = null;
    }, []);

    // Initialize Cesium viewer
    useEffect(() => {
        if (!containerRef.current || viewerRef.current) return;

        // Core Initialization - bypass Ion tokens with robust URL templates
        const esriProvider = new Cesium.UrlTemplateImageryProvider({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            maximumLevel: 19,
            credit: 'Esri World Imagery'
        });

        const viewer = new Cesium.Viewer(containerRef.current, {
            terrainProvider: new Cesium.EllipsoidTerrainProvider(),
            baseLayer: new Cesium.ImageryLayer(esriProvider),
            baseLayerPicker: false,
            animation: false,
            fullscreenButton: false,
            geocoder: false,
            homeButton: false,
            infoBox: false,
            sceneModePicker: false,
            selectionIndicator: false,
            timeline: false,
            navigationHelpButton: false,
            creditContainer: document.createElement('div'), // hide credits
            skyAtmosphere: false,
            scene3DOnly: true,
            shadows: false,
            requestRenderMode: false,
        });

        // Force a dark, eye-friendly space backdrop (no bright atmospheric blue)
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0a0a0f');
        if (viewer.scene.skyBox) {
            viewer.scene.skyBox.show = false;
        }
        viewer.scene.globe.showGroundAtmosphere = false;
        viewer.scene.fog.enabled = false;
        viewer.scene.globe.enableLighting = true;

        // Tweak camera controls for a crisper, more pleasant dragging experience
        viewer.scene.screenSpaceCameraController.inertiaSpin = 0;
        viewer.scene.screenSpaceCameraController.inertiaTranslate = 0;
        viewer.scene.screenSpaceCameraController.inertiaZoom = 0;
        viewer.scene.screenSpaceCameraController.enableTilt = true;
        viewer.scene.screenSpaceCameraController.minimumZoomDistance = MIN_CAMERA_HEIGHT_M;
        viewer.scene.screenSpaceCameraController.maximumZoomDistance = MAX_CAMERA_HEIGHT_M;
        viewer.scene.screenSpaceCameraController.enableCollisionDetection = true;

        // Ensure touch gestures route to Cesium (including pinch on touch devices).
        viewer.scene.canvas.style.touchAction = 'none';

        // Zoom-aware labels: country/continent when zoomed out, cities when zoomed in.
        try {
            const countryLabelProvider = new Cesium.UrlTemplateImageryProvider({
                url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}',
                maximumLevel: 8,
                credit: 'Esri',
            });
            const cityLabelProvider = new Cesium.UrlTemplateImageryProvider({
                url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
                maximumLevel: 15,
                credit: 'Esri',
            });
            const countryLayer = viewer.imageryLayers.addImageryProvider(countryLabelProvider);
            const cityLayer = viewer.imageryLayers.addImageryProvider(cityLabelProvider);
            countryLayer.alpha = 0.86;
            cityLayer.alpha = 0.92;
            labelLayersRef.current = { country: countryLayer, city: cityLayer };
        } catch (err) {
            labelLayersRef.current = { country: null, city: null };
        }

        // Set initial camera position
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
                DEFAULT_CAMERA.longitude,
                DEFAULT_CAMERA.latitude,
                DEFAULT_CAMERA.height
            ),
            orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-90),
                roll: 0,
            },
            duration: 0,
        });

        viewerRef.current = viewer;
        setViewerRefStore(viewer);
        setViewerReady(true);

        const updateZoomLabelVisibility = () => {
            const height = viewer.camera.positionCartographic?.height || DEFAULT_CAMERA.height;
            const { country, city } = labelLayersRef.current;
            if (country) {
                country.show = height >= LABEL_COUNTRY_MIN_HEIGHT_M;
            }
            if (city) {
                city.show = height <= LABEL_CITY_MAX_HEIGHT_M;
            }
        };
        updateZoomLabelVisibility();

        let lastGestureScale = 1;

        const handleNativeWheel = (event) => {
            if (!event.ctrlKey) return;
            event.preventDefault();
            setAutoRotating(false);

            const height = viewer.camera.positionCartographic?.height || DEFAULT_CAMERA.height;
            const step = Math.max(2500, Math.min(1800000, height * 0.12));
            if (event.deltaY > 0) {
                viewer.camera.zoomOut(step);
            } else {
                viewer.camera.zoomIn(step);
            }
            viewer.scene.requestRender();
        };

        const handleGestureStart = (event) => {
            event.preventDefault();
            lastGestureScale = event.scale || 1;
            setAutoRotating(false);
        };

        const handleGestureChange = (event) => {
            event.preventDefault();
            const currentScale = event.scale || 1;
            const delta = currentScale - lastGestureScale;
            lastGestureScale = currentScale;
            if (Math.abs(delta) < 0.005) return;

            const height = viewer.camera.positionCartographic?.height || DEFAULT_CAMERA.height;
            const step = Math.max(2200, Math.min(1800000, height * 0.09));
            if (delta > 0) {
                viewer.camera.zoomIn(step);
            } else {
                viewer.camera.zoomOut(step);
            }
            viewer.scene.requestRender();
        };
        viewer.scene.canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
        viewer.scene.canvas.addEventListener('gesturestart', handleGestureStart, { passive: false });
        viewer.scene.canvas.addEventListener('gesturechange', handleGestureChange, { passive: false });

        const handleCameraChanged = () => {
            updateZoomLabelVisibility();
            if (viewer.trackedEntity) return;

            const carto = viewer.camera.positionCartographic;
            if (!carto) return;
            const height = carto.height || 0;
            if (height < AUTO_RECENTER_HEIGHT_M) return;
            if (viewer.camera.pitch <= ZOOM_SNAP_PITCH_THRESHOLD_RAD) return;

            const now = Date.now();
            if (now - cameraRecenterStateRef.current.lastAppliedMs < AUTO_RECENTER_MIN_INTERVAL_MS) {
                return;
            }
            cameraRecenterStateRef.current.lastAppliedMs = now;

            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(
                    Cesium.Math.toDegrees(carto.longitude),
                    Cesium.Math.toDegrees(carto.latitude),
                    Math.min(height, MAX_CAMERA_HEIGHT_M)
                ),
                orientation: {
                    heading: viewer.camera.heading,
                    pitch: Cesium.Math.toRadians(-88),
                    roll: 0,
                },
                duration: 0.55,
            });
        };
        viewer.camera.changed.addEventListener(handleCameraChanged);

        // Stop auto-rotation on user interaction
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction(() => {
            setAutoRotating(false);
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
        handler.setInputAction(() => {
            setAutoRotating(false);
        }, Cesium.ScreenSpaceEventType.WHEEL);

        const parsePickedEntity = (pickedObject) => {
            if (!(Cesium.defined(pickedObject) && pickedObject.id)) {
                return null;
            }

            const props = {};
            const propertyBag = pickedObject.id.properties;
            const propertyNames = propertyBag?.propertyNames || [];
            const time = viewer.clock.currentTime;

            propertyNames.forEach((name) => {
                try {
                    const val = propertyBag[name].getValue(time);
                    if (val !== undefined) props[name] = val;
                } catch (e) {
                    props[name] = propertyBag[name];
                }
            });

            const entityId = pickedObject.id.id || null;
            const positionProp = pickedObject.id.position;
            const position =
                typeof positionProp?.getValue === 'function'
                    ? positionProp.getValue(time)
                    : positionProp;
            if (position && (!props.latitude || !props.longitude)) {
                const carto = Cesium.Cartographic.fromCartesian(position);
                if (carto) {
                    if (!props.latitude) props.latitude = Cesium.Math.toDegrees(carto.latitude).toFixed(4);
                    if (!props.longitude) props.longitude = Cesium.Math.toDegrees(carto.longitude).toFixed(4);
                }
            }

            const inferredLayerType = props._layerType || inferLayerTypeFromEntityId(entityId);
            if (inferredLayerType === 'traffic' && !props.status && String(entityId || '').startsWith('traffic-road-')) {
                props.status = 'ROAD SEGMENT';
            }

            return {
                ...props,
                type: inferredLayerType,
                name: pickedObject.id.name || String(entityId || 'Unknown'),
                _entityId: entityId,
            };
        };

        // Entity click handler
        handler.setInputAction((click) => {
            const pickedObject = viewer.scene.pick(click.position);
            const parsed = parsePickedEntity(pickedObject);
            if (parsed) {
                clearHoverInfo();
                setInspector(parsed);
            } else {
                // Clicked on empty space, close inspector
                setInspector(null);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Hover preview handler
        handler.setInputAction((movement) => {
            const screenPos = movement?.endPosition;
            if (!screenPos) return;

            const pickedObject = viewer.scene.pick(screenPos);
            const parsed = parsePickedEntity(pickedObject);
            if (!parsed) {
                if (hoveredEntityIdRef.current !== null) {
                    hoveredEntityIdRef.current = null;
                    clearHoverInfo();
                }
                return;
            }

            const hoverEntityId = parsed._entityId || `${parsed.type}:${parsed.name}`;
            const now = performance.now();
            const shouldThrottle =
                hoveredEntityIdRef.current === hoverEntityId &&
                now - lastHoverUpdateMsRef.current < 33;
            if (shouldThrottle) return;

            hoveredEntityIdRef.current = hoverEntityId;
            lastHoverUpdateMsRef.current = now;
            setHoverInfo({
                ...parsed,
                screenX: screenPos.x,
                screenY: screenPos.y,
                timestamp: Date.now(),
            });
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        return () => {
            viewer.scene.canvas.removeEventListener('wheel', handleNativeWheel);
            viewer.scene.canvas.removeEventListener('gesturestart', handleGestureStart);
            viewer.scene.canvas.removeEventListener('gesturechange', handleGestureChange);
            viewer.camera.changed.removeEventListener(handleCameraChanged);
            handler.destroy();
            removeTrail();
            restoreTrackedAircraftVisual();
            hoveredEntityIdRef.current = null;
            clearHoverInfo();
            if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                viewerRef.current.destroy();
            }
            viewerRef.current = null;
            setViewerRefStore(null);
        };
    }, [
        clearHoverInfo,
        removeTrail,
        restoreTrackedAircraftVisual,
        setAutoRotating,
        setHoverInfo,
        setInspector,
        setViewerRefStore,
    ]);

    // Auto-rotation
    useEffect(() => {
        if (!viewerRef.current) return;
        const viewer = viewerRef.current;

        let animationFrameId;
        const rotate = () => {
            if (isAutoRotating && viewer && !viewer.isDestroyed()) {
                viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, 0.0003);
            }
            animationFrameId = requestAnimationFrame(rotate);
        };

        if (isAutoRotating) {
            animationFrameId = requestAnimationFrame(rotate);
        }

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [isAutoRotating]);

    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer || viewer.isDestroyed()) return;

        if (!trackedTarget?.entityId) {
            viewer.trackedEntity = undefined;
            removeTrail();
            restoreTrackedAircraftVisual();
            return;
        }

        const targetEntity = viewer.entities.getById(trackedTarget.entityId);
        if (!targetEntity) {
            clearTrackedTarget();
            removeTrail();
            restoreTrackedAircraftVisual();
            return;
        }

        setAutoRotating(false);
        if (trackedTarget.type === 'aircraft') {
            applyTrackedAircraftVisual(targetEntity);
        } else {
            restoreTrackedAircraftVisual();
        }
        targetEntity.viewFrom = Cesium.Cartesian3.clone(getTrackViewOffset(trackedTarget.type, trackingView));
        viewer.trackedEntity = targetEntity;
        removeTrail();

        const trailColor = trackedTarget.type === 'satellites'
            ? Cesium.Color.fromCssColorString('#ffaa00')
            : Cesium.Color.fromCssColorString('#00b4ff');

        trailEntityRef.current = viewer.entities.add({
            id: `track-trail-${trackedTarget.entityId}`,
            polyline: {
                positions: new Cesium.CallbackProperty(() => trailPositionsRef.current, false),
                width: 2.5,
                material: new Cesium.PolylineGlowMaterialProperty({
                    glowPower: 0.2,
                    taperPower: 0.4,
                    color: trailColor.withAlpha(0.85),
                }),
                clampToGround: false,
            },
        });

        const captureTrailPoint = () => {
            const liveEntity = viewer.entities.getById(trackedTarget.entityId);
            if (!liveEntity) {
                clearTrackedTarget();
                removeTrail();
                return;
            }

            let position = null;
            const positionProp = liveEntity.position;
            if (positionProp && typeof positionProp.getValue === 'function') {
                position = positionProp.getValue(viewer.clock.currentTime);
            } else if (positionProp) {
                position = positionProp;
            }

            if (!position) return;

            const trail = trailPositionsRef.current;
            const lastPoint = trail[trail.length - 1];
            if (!lastPoint || Cesium.Cartesian3.distance(lastPoint, position) >= MIN_TRACK_POINT_DISTANCE_METERS) {
                trail.push(Cesium.Cartesian3.clone(position));
                if (trail.length > MAX_TRACK_POINTS) {
                    trail.splice(0, trail.length - MAX_TRACK_POINTS);
                }
                viewer.scene.requestRender();
            }
        };

        captureTrailPoint();
        trailTimerRef.current = setInterval(captureTrailPoint, TRACK_SAMPLE_INTERVAL_MS);

        return () => {
            clearInterval(trailTimerRef.current);
            trailTimerRef.current = null;
        };
    }, [
        trackedTarget,
        applyTrackedAircraftVisual,
        clearTrackedTarget,
        removeTrail,
        restoreTrackedAircraftVisual,
        setAutoRotating,
    ]);

    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer || viewer.isDestroyed() || !trackedTarget?.entityId) return;

        const targetEntity = viewer.entities.getById(trackedTarget.entityId);
        if (!targetEntity) return;

        targetEntity.viewFrom = Cesium.Cartesian3.clone(
            getTrackViewOffset(trackedTarget.type, trackingView)
        );

        // Cesium does not always apply viewFrom changes on an already-tracked entity.
        // Rebind tracking to force camera offset refresh for Top/Side/Cinematic controls.
        viewer.trackedEntity = undefined;
        viewer.trackedEntity = targetEntity;
        viewer.scene.requestRender();
    }, [trackedTarget, trackingView]);

    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer || viewer.isDestroyed()) return;

        const visibilitySnapshot = focusHiddenSnapshotRef.current;
        const trackedEntityId = trackedTarget?.entityId || null;

        const restoreEntityVisibility = () => {
            for (const [id, wasVisible] of visibilitySnapshot.entries()) {
                const entity = viewer.entities.getById(id);
                if (entity) {
                    entity.show = wasVisible;
                }
            }
            visibilitySnapshot.clear();
            viewer.scene.requestRender();
        };

        if (!focusHideEntities) {
            restoreEntityVisibility();
            return;
        }

        const enforceTargetOnlyVisibility = () => {
            for (const entity of viewer.entities.values) {
                const id = String(entity.id || '');
                if (!visibilitySnapshot.has(id)) {
                    visibilitySnapshot.set(id, Boolean(entity.show ?? true));
                }
                const keepTrail = trackedEntityId && id === `track-trail-${trackedEntityId}`;
                entity.show = Boolean(trackedEntityId && id === trackedEntityId) || keepTrail;
            }
        };

        enforceTargetOnlyVisibility();
        const removePostRender = viewer.scene.postRender.addEventListener(enforceTargetOnlyVisibility);

        return () => {
            if (typeof removePostRender === 'function') {
                removePostRender();
            }
            if (!useStore.getState().focusHideEntities) {
                restoreEntityVisibility();
            }
        };
    }, [focusHideEntities, trackedTarget]);

    return (
        <>
            <div
                ref={containerRef}
                style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            />
            {viewerReady && viewerRef.current && (
                <>
                    <AircraftLayer viewer={viewerRef.current} />
                    <SatelliteLayer viewer={viewerRef.current} />
                    <SeismicLayer viewer={viewerRef.current} />
                    <AirportsLayer viewer={viewerRef.current} />
                    <SeismicStationsLayer viewer={viewerRef.current} />
                    <MaritimeLayer viewer={viewerRef.current} />
                    <PowerGridLayer viewer={viewerRef.current} />
                    <HazardsLayer viewer={viewerRef.current} />
                    <DisasterLayer viewer={viewerRef.current} />
                    <ConflictLayer viewer={viewerRef.current} />
                    <OceanBuoysLayer viewer={viewerRef.current} />
                    <VolcanoesLayer viewer={viewerRef.current} />
                    <SpaceWeatherLayer viewer={viewerRef.current} />
                    <MetarLayer viewer={viewerRef.current} />
                    <FireHotspotsLayer viewer={viewerRef.current} />
                    <AviationHazardsLayer viewer={viewerRef.current} />
                    <SolarFlaresLayer viewer={viewerRef.current} />
                    <WeatherLayer viewer={viewerRef.current} />
                    <AirQualityLayer viewer={viewerRef.current} />
                    <CameraLayer viewer={viewerRef.current} />
                    <TrafficLayer viewer={viewerRef.current} />
                    <MilitaryActivityLayer viewer={viewerRef.current} />
                    <MilitaryBasesLayer viewer={viewerRef.current} />
                    <ForbiddenZonesLayer viewer={viewerRef.current} />
                    <AirspaceLayer viewer={viewerRef.current} />
                </>
            )}
        </>
    );
}
