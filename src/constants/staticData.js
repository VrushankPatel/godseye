// Curated list of publicly accessible traffic camera feeds
// These cameras serve JPEG stills for thumbnails and YouTube embeds for live video
export const CAMERA_FEEDS = [
    {
        id: 'nyc-times-square',
        name: 'Times Square, NYC',
        lat: 40.758,
        lng: -73.9855,
        url: 'https://images.earthcam.com/ec_metros/ecdms28/TimesSquare/tsq_cam1.jpg',
        videoUrl: 'https://www.youtube.com/embed/1-iS7LArMPA?autoplay=1&mute=1',
        city: 'New York',
        type: 'traffic',
    },
    {
        id: 'tokyo-shibuya',
        name: 'Shibuya Crossing, Tokyo',
        lat: 35.6595,
        lng: 139.7004,
        url: 'https://weathernews.jp/s/topics/img/shibuya_cam.jpg',
        videoUrl: 'https://www.youtube.com/embed/HjiR_w-L6kM?autoplay=1&mute=1',
        city: 'Tokyo',
        type: 'traffic',
    },
    {
        id: 'venice-canals',
        name: 'Venice Grand Canal',
        lat: 45.4408,
        lng: 12.3155,
        url: 'https://images.earthcam.com/ec_metros/venice/venice1.jpg',
        videoUrl: 'https://www.youtube.com/embed/ph1vpnYIxJk?autoplay=1&mute=1',
        city: 'Venice',
        type: 'landmark',
    },
    {
        id: 'iss-live',
        name: 'ISS Live Earth Viewing',
        lat: 0.0,
        lng: 0.0,
        url: 'https://www.nasa.gov/wp-content/uploads/2023/10/iss068e027964.jpg',
        videoUrl: 'https://www.youtube.com/embed/21X5lGlDOfg?autoplay=1&mute=1',
        city: 'Low Earth Orbit',
        type: 'landmark',
    },
];

// Static airspace restricted zones (simplified GeoJSON)
export const RESTRICTED_AIRSPACE = [
    {
        id: 'dc-sfra',
        name: 'Washington DC SFRA',
        type: 'Restricted',
        center: [-77.0369, 38.9072],
        radius: 55000, // meters
        color: 'rgba(255, 0, 0, 0.15)',
        borderColor: 'rgba(255, 0, 0, 0.5)',
    },
    {
        id: 'dc-frz',
        name: 'Washington DC FRZ',
        type: 'Prohibited',
        center: [-77.0369, 38.9072],
        radius: 25000,
        color: 'rgba(255, 0, 0, 0.25)',
        borderColor: 'rgba(255, 0, 0, 0.8)',
    },
    {
        id: 'area51',
        name: 'Area 51 / Groom Lake',
        type: 'Restricted',
        center: [-115.8111, 37.235],
        radius: 40000,
        color: 'rgba(255, 0, 0, 0.15)',
        borderColor: 'rgba(255, 0, 0, 0.5)',
    },
    {
        id: 'camp-david',
        name: 'Camp David TFR',
        type: 'Prohibited',
        center: [-77.463, 39.648],
        radius: 18500,
        color: 'rgba(255, 0, 0, 0.2)',
        borderColor: 'rgba(255, 0, 0, 0.6)',
    },
    {
        id: 'heathrow',
        name: 'London Heathrow CTR',
        type: 'Controlled',
        center: [-0.4543, 51.4700],
        radius: 15000,
        color: 'rgba(0, 180, 255, 0.1)',
        borderColor: 'rgba(0, 180, 255, 0.4)',
    },
];
