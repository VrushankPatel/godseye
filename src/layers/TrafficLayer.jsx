import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';
import { WORLDCAMS_FEEDS } from '../constants/worldcamsFeeds';

const TRAFFIC_PATHS = [
    // North America
    [[-74.02, 40.70], [-73.99, 40.74], [-73.96, 40.77], [-73.92, 40.80]], // NYC
    [[-118.29, 34.04], [-118.25, 34.06], [-118.20, 34.08], [-118.14, 34.10]], // LA
    [[-87.70, 41.86], [-87.66, 41.88], [-87.63, 41.89], [-87.60, 41.90]], // Chicago
    [[-122.52, 37.76], [-122.46, 37.77], [-122.42, 37.78], [-122.37, 37.79]], // SF
    [[-79.42, 43.64], [-79.39, 43.66], [-79.36, 43.68], [-79.33, 43.69]], // Toronto

    // Europe
    [[-0.20, 51.49], [-0.14, 51.50], [-0.10, 51.51], [-0.05, 51.52]], // London
    [[2.27, 48.84], [2.31, 48.86], [2.35, 48.87], [2.40, 48.88]], // Paris
    [[13.34, 52.48], [13.38, 52.50], [13.42, 52.52], [13.47, 52.53]], // Berlin
    [[12.46, 41.88], [12.49, 41.89], [12.52, 41.90], [12.56, 41.91]], // Rome

    // Asia
    [[139.67, 35.64], [139.70, 35.66], [139.74, 35.68], [139.78, 35.70]], // Tokyo
    [[126.96, 37.53], [127.00, 37.54], [127.03, 37.55], [127.06, 37.56]], // Seoul
    [[116.34, 39.89], [116.38, 39.90], [116.42, 39.91], [116.46, 39.92]], // Beijing
    [[77.19, 28.60], [77.22, 28.62], [77.25, 28.64], [77.29, 28.66]], // Delhi
    [[72.82, 18.95], [72.85, 18.97], [72.88, 18.99], [72.91, 19.01]], // Mumbai

    // Middle East / Africa
    [[55.24, 25.19], [55.27, 25.21], [55.30, 25.23], [55.34, 25.25]], // Dubai
    [[31.20, 30.01], [31.23, 30.03], [31.26, 30.05], [31.30, 30.06]], // Cairo
    [[18.41, -33.94], [18.44, -33.93], [18.47, -33.92], [18.50, -33.91]], // Cape Town

    // South America / Oceania
    [[-46.67, -23.58], [-46.64, -23.56], [-46.61, -23.54], [-46.57, -23.52]], // Sao Paulo
    [[-58.47, -34.65], [-58.43, -34.63], [-58.39, -34.61], [-58.35, -34.59]], // Buenos Aires
    [[151.15, -33.90], [151.19, -33.88], [151.23, -33.86], [151.27, -33.84]], // Sydney
];

const VEHICLES_PER_PATH = 34;
const MAX_TRAFFIC_FEEDS = 320;
const TRAFFIC_KEYWORDS = [
    'traffic', 'road', 'highway', 'street', 'bridge', 'airport', 'train', 'station', 'port',
];

function getPointAlongPath(path, segmentIndex, progress) {
    const start = path[segmentIndex];
    const end = path[Math.min(segmentIndex + 1, path.length - 1)];
    const lng = start[0] + (end[0] - start[0]) * progress;
    const lat = start[1] + (end[1] - start[1]) * progress;
    return [lng, lat];
}

function looksTrafficRelated(feed) {
    const haystack = `${feed.name || ''} ${feed.detailsUrl || ''}`.toLowerCase();
    return TRAFFIC_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

export default function TrafficLayer({ viewer }) {
    const isEnabled = useStore((s) => s.layers.traffic.enabled);
    const updateData = useStore((s) => s.updateLayerData);
    const setStatus = useStore((s) => s.setLayerStatus);

    const entitiesRef = useRef([]);
    const roadsRef = useRef([]);
    const vehiclesRef = useRef([]);
    const animationTimerRef = useRef(null);

    const clearLayer = useCallback(() => {
        clearInterval(animationTimerRef.current);
        entitiesRef.current.forEach((entity) => viewer.entities.remove(entity));
        roadsRef.current.forEach((entity) => viewer.entities.remove(entity));
        entitiesRef.current = [];
        roadsRef.current = [];
        vehiclesRef.current = [];
    }, [viewer]);

    useEffect(() => {
        if (!isEnabled) {
            clearLayer();
            setStatus('traffic', 'idle');
            updateData('traffic', []);
            return;
        }

        setStatus('traffic', 'loading');
        clearLayer();

        // Render route skeletons so traffic is always visible even when zoomed out.
        TRAFFIC_PATHS.forEach((path, idx) => {
            const roadEntity = viewer.entities.add({
                id: `traffic-road-${idx}`,
                polyline: {
                    positions: path.map(([lng, lat]) => Cesium.Cartesian3.fromDegrees(lng, lat, 20)),
                    width: 4,
                    material: new Cesium.PolylineGlowMaterialProperty({
                        glowPower: 0.55,
                        taperPower: 0.35,
                        color: Cesium.Color.fromCssColorString('#00ff95').withAlpha(0.72),
                    }),
                    clampToGround: false,
                },
            });
            roadsRef.current.push(roadEntity);
        });

        // Spawn animated traffic particles along all major corridors.
        const vehicles = [];
        let counter = 0;
        TRAFFIC_PATHS.forEach((path, pathIndex) => {
            for (let i = 0; i < VEHICLES_PER_PATH; i++) {
                const segmentIndex = Math.floor(Math.random() * (path.length - 1));
                vehicles.push({
                    id: `traffic-veh-${counter++}`,
                    pathIndex,
                    segmentIndex,
                    progress: Math.random(),
                    speed: 0.002 + Math.random() * 0.005,
                    direction: Math.random() > 0.5 ? 1 : -1,
                });
            }
        });
        vehiclesRef.current = vehicles;

        vehicles.forEach((vehicle) => {
            const path = TRAFFIC_PATHS[vehicle.pathIndex];
            const [lng, lat] = getPointAlongPath(path, vehicle.segmentIndex, vehicle.progress);

            const entity = viewer.entities.add({
                id: vehicle.id,
                position: new Cesium.CallbackProperty(() => {
                    const curPath = TRAFFIC_PATHS[vehicle.pathIndex];
                    const maxSegment = curPath.length - 2;
                    vehicle.progress += vehicle.speed;

                    if (vehicle.progress >= 1) {
                        vehicle.progress = 0;
                        vehicle.segmentIndex += vehicle.direction;
                        if (vehicle.segmentIndex >= maxSegment || vehicle.segmentIndex <= 0) {
                            vehicle.segmentIndex = Math.max(0, Math.min(maxSegment, vehicle.segmentIndex));
                            vehicle.direction *= -1;
                        }
                    }

                    const [curLng, curLat] = getPointAlongPath(curPath, vehicle.segmentIndex, vehicle.progress);
                    return Cesium.Cartesian3.fromDegrees(curLng, curLat, 30);
                }, false),
                point: {
                    pixelSize: 6,
                    color: Cesium.Color.fromCssColorString('#00ff95').withAlpha(0.96),
                    outlineColor: Cesium.Color.WHITE.withAlpha(0.8),
                    outlineWidth: 1.5,
                    disableDepthTestDistance: 7000000,
                },
                properties: {
                    _layerType: 'traffic',
                    id: vehicle.id,
                    status: 'FLOWING',
                },
            });

            entitiesRef.current.push(entity);
        });

        // Add real traffic-oriented live feed points to this layer.
        const trafficFeeds = WORLDCAMS_FEEDS
            .filter((feed) => looksTrafficRelated(feed) && (feed.videoUrl || feed.url))
            .slice(0, MAX_TRAFFIC_FEEDS);

        trafficFeeds.forEach((feed) => {
            const entity = viewer.entities.add({
                id: `traffic-feed-${feed.id}`,
                position: Cesium.Cartesian3.fromDegrees(feed.lng, feed.lat, 160),
                name: feed.name,
                point: {
                    pixelSize: 5,
                    color: Cesium.Color.fromCssColorString('#00ff95').withAlpha(0.92),
                    outlineColor: Cesium.Color.WHITE.withAlpha(0.75),
                    outlineWidth: 1,
                    disableDepthTestDistance: 9000000,
                },
                properties: {
                    _layerType: 'traffic',
                    id: feed.id,
                    provider: feed.provider,
                    city: feed.city || 'Unknown',
                    latitude: feed.lat.toFixed(4),
                    longitude: feed.lng.toFixed(4),
                    url: feed.url || null,
                    videoUrl: feed.videoUrl || null,
                    fallbackUrl: feed.fallbackUrl || feed.url || null,
                    mediaType: feed.mediaType || 'embed',
                    refreshSeconds: feed.refreshSeconds || 12,
                    status: 'LIVE',
                },
            });
            entitiesRef.current.push(entity);
        });

        updateData('traffic', [...vehicles, ...trafficFeeds]);
        setStatus('traffic', 'active');

        animationTimerRef.current = setInterval(() => {
            if (!viewer.isDestroyed()) viewer.scene.requestRender();
        }, 66);

        return () => {
            clearLayer();
        };
    }, [isEnabled, viewer, updateData, setStatus, clearLayer]);

    return null;
}
