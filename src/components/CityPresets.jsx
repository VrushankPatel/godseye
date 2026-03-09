import React from 'react';

const CITIES = [
    { name: 'GLOBAL', lat: 20, lng: 0, alt: 2.5 },
    { name: 'LONDON', lat: 51.5074, lng: -0.1278, alt: 0.4 },
    { name: 'NEW YORK', lat: 40.7128, lng: -74.006, alt: 0.4 },
    { name: 'TOKYO', lat: 35.6762, lng: 139.6503, alt: 0.4 },
    { name: 'DUBAI', lat: 25.2048, lng: 55.2708, alt: 0.4 },
    { name: 'SYDNEY', lat: -33.8688, lng: 151.2093, alt: 0.4 },
];

export default function CityPresets({ globeRef }) {
    const flyTo = (city) => {
        if (!globeRef?.current) return;
        globeRef.current.pointOfView(
            { lat: city.lat, lng: city.lng, altitude: city.alt },
            1200
        );
    };

    return (
        <div className="city-presets">
            {CITIES.map((city) => (
                <button
                    key={city.name}
                    className="city-preset-btn"
                    onClick={() => flyTo(city)}
                >
                    {city.name}
                </button>
            ))}
        </div>
    );
}
