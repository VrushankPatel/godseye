const ISS_LIVE_EMBED_URL = 'https://www.youtube.com/embed/21X5lGlDOfg?autoplay=1&rel=0';
const GOES_EAST_IMAGE_URL = 'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/678x678.jpg';
const GOES_WEST_IMAGE_URL = 'https://cdn.star.nesdis.noaa.gov/GOES18/ABI/FD/GEOCOLOR/678x678.jpg';

export function getSatellitePriorityScore(name = '') {
    const upper = String(name || '').toUpperCase();
    let score = 0;

    if (upper.includes('ISS') || upper.includes('ZARYA')) score += 10000;
    if (upper.includes('GOES')) score += 7000;
    if (upper.includes('HST') || upper.includes('HUBBLE')) score += 3000;
    if (upper.includes('NOAA') || upper.includes('WEATHER')) score += 1400;
    if (upper.includes('STARLINK')) score += 900;

    return score;
}

export function getSatelliteLiveView(name = '') {
    const upper = String(name || '').toUpperCase();

    if (upper.includes('ISS') || upper.includes('ZARYA')) {
        return {
            mediaEnabled: true,
            mediaType: 'embed',
            videoUrl: ISS_LIVE_EMBED_URL,
            fallbackUrl: 'https://img.youtube.com/vi/21X5lGlDOfg/hqdefault.jpg',
            detailsUrl: 'https://www.nasa.gov/nasatv/',
            refreshSeconds: 30,
            liveView: 'ISS LIVE CAM',
            liveSource: 'NASA TV',
        };
    }

    if (
        /GOES[\s-]?(16|19)\b/.test(upper) ||
        upper.includes('GOES EAST') ||
        upper.includes('GOES-EAST')
    ) {
        return {
            mediaEnabled: true,
            mediaType: 'image',
            url: GOES_EAST_IMAGE_URL,
            fallbackUrl: GOES_EAST_IMAGE_URL,
            detailsUrl: 'https://www.star.nesdis.noaa.gov/GOES/fulldisk.php?sat=G19',
            refreshSeconds: 600,
            liveView: 'FULL DISK EARTH',
            liveSource: 'NOAA GOES East',
        };
    }

    if (
        /GOES[\s-]?(17|18)\b/.test(upper) ||
        upper.includes('GOES WEST') ||
        upper.includes('GOES-WEST')
    ) {
        return {
            mediaEnabled: true,
            mediaType: 'image',
            url: GOES_WEST_IMAGE_URL,
            fallbackUrl: GOES_WEST_IMAGE_URL,
            detailsUrl: 'https://www.star.nesdis.noaa.gov/GOES/fulldisk.php?sat=G18',
            refreshSeconds: 600,
            liveView: 'FULL DISK EARTH',
            liveSource: 'NOAA GOES West',
        };
    }

    return null;
}
