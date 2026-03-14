export const NEWS_RELAY_GROUPS = [
    { id: 'breaking', label: 'BREAKING' },
    { id: 'mideast', label: 'MIDEAST' },
    { id: 'europe', label: 'EUROPE' },
    { id: 'asia', label: 'ASIA' },
    { id: 'business', label: 'BUSINESS' },
];

function buildYouTubeEmbedUrl(videoId) {
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`;
}

function buildYouTubeWatchUrl(videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
}

function buildYouTubePreviewUrl(videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export const CURATED_NEWS_STREAMS = [
    {
        id: 'bloomberg',
        name: 'Bloomberg',
        provider: 'Bloomberg Television',
        type: 'youtube',
        videoId: 'iEpJwprxDdk',
        streamUrl: buildYouTubeEmbedUrl('iEpJwprxDdk'),
        sourceUrl: buildYouTubeWatchUrl('iEpJwprxDdk'),
        previewUrl: buildYouTubePreviewUrl('iEpJwprxDdk'),
        groups: ['breaking', 'business'],
        note: 'Markets, macro, and global breaking coverage.',
        language: 'EN',
        priority: 100,
    },
    {
        id: 'dw-news',
        name: 'DW',
        provider: 'DW News',
        type: 'youtube',
        videoId: 'LuKwFajn37U',
        streamUrl: buildYouTubeEmbedUrl('LuKwFajn37U'),
        sourceUrl: buildYouTubeWatchUrl('LuKwFajn37U'),
        previewUrl: buildYouTubePreviewUrl('LuKwFajn37U'),
        groups: ['breaking', 'europe'],
        note: 'European and global headline stream.',
        language: 'EN',
        priority: 96,
    },
    {
        id: 'euronews',
        name: 'Euronews',
        provider: 'euronews',
        type: 'youtube',
        videoId: 'pykpO5kQJ98',
        streamUrl: buildYouTubeEmbedUrl('pykpO5kQJ98'),
        sourceUrl: buildYouTubeWatchUrl('pykpO5kQJ98'),
        previewUrl: buildYouTubePreviewUrl('pykpO5kQJ98'),
        groups: ['breaking', 'europe'],
        note: 'Pan-European live newsroom.',
        language: 'EN',
        priority: 94,
    },
    {
        id: 'france24-en',
        name: 'France 24',
        provider: 'FRANCE 24 English',
        type: 'youtube',
        videoId: 'Ap-UM1O9RBU',
        streamUrl: buildYouTubeEmbedUrl('Ap-UM1O9RBU'),
        sourceUrl: buildYouTubeWatchUrl('Ap-UM1O9RBU'),
        previewUrl: buildYouTubePreviewUrl('Ap-UM1O9RBU'),
        groups: ['breaking', 'europe', 'mideast'],
        note: 'International live desk with Europe and MENA coverage.',
        language: 'EN',
        priority: 92,
    },
    {
        id: 'aljazeera-english',
        name: 'Al Jazeera',
        provider: 'Al Jazeera English',
        type: 'youtube',
        videoId: 'gCNeDWCI0vo',
        streamUrl: buildYouTubeEmbedUrl('gCNeDWCI0vo'),
        sourceUrl: buildYouTubeWatchUrl('gCNeDWCI0vo'),
        previewUrl: buildYouTubePreviewUrl('gCNeDWCI0vo'),
        groups: ['breaking', 'mideast'],
        note: 'Middle East and global south perspective.',
        language: 'EN',
        priority: 98,
    },
    {
        id: 'sky-news-arabia',
        name: 'Sky Arabia',
        provider: 'Sky News Arabia',
        type: 'youtube',
        videoId: 'U--OjmpjF5o',
        streamUrl: buildYouTubeEmbedUrl('U--OjmpjF5o'),
        sourceUrl: buildYouTubeWatchUrl('U--OjmpjF5o'),
        previewUrl: buildYouTubePreviewUrl('U--OjmpjF5o'),
        groups: ['mideast'],
        note: 'Arabic-language rolling coverage.',
        language: 'AR',
        priority: 90,
    },
    {
        id: 'trt-world',
        name: 'TRT World',
        provider: 'TRT World',
        type: 'youtube',
        videoId: 'ABfFhWzWs0s',
        streamUrl: buildYouTubeEmbedUrl('ABfFhWzWs0s'),
        sourceUrl: buildYouTubeWatchUrl('ABfFhWzWs0s'),
        previewUrl: buildYouTubePreviewUrl('ABfFhWzWs0s'),
        groups: ['mideast', 'asia', 'europe'],
        note: 'Cross-theater coverage spanning Europe, MENA, and Asia.',
        language: 'EN',
        priority: 88,
    },
    {
        id: 'alarabiya',
        name: 'Al Arabiya',
        provider: 'AlArabiya',
        type: 'youtube',
        videoId: 'n7eQejkXbnM',
        streamUrl: buildYouTubeEmbedUrl('n7eQejkXbnM'),
        sourceUrl: buildYouTubeWatchUrl('n7eQejkXbnM'),
        previewUrl: buildYouTubePreviewUrl('n7eQejkXbnM'),
        groups: ['mideast'],
        note: 'Arabic regional desk and breaking coverage.',
        language: 'AR',
        priority: 86,
    },
    {
        id: 'aj-mubasher',
        name: 'AJ Mubasher',
        provider: 'Al Jazeera Mubasher',
        type: 'hls',
        streamUrl: 'https://live-hls-web-ajm.getaj.net/AJM/index.m3u8',
        sourceUrl: 'https://mubasher.aljazeera.net/live/',
        previewUrl: '',
        groups: ['mideast'],
        note: 'Direct HLS relay verified live.',
        language: 'AR',
        priority: 84,
    },
    {
        id: 'cna',
        name: 'CNA',
        provider: 'Channel News Asia',
        type: 'youtube',
        videoId: 'XWq5kBlakcQ',
        streamUrl: buildYouTubeEmbedUrl('XWq5kBlakcQ'),
        sourceUrl: buildYouTubeWatchUrl('XWq5kBlakcQ'),
        previewUrl: buildYouTubePreviewUrl('XWq5kBlakcQ'),
        groups: ['asia'],
        note: 'Asia-focused headlines and documentaries.',
        language: 'EN',
        priority: 90,
    },
    {
        id: 'india-today',
        name: 'India Today',
        provider: 'India Today',
        type: 'youtube',
        videoId: 'sYZtOFzM78M',
        streamUrl: buildYouTubeEmbedUrl('sYZtOFzM78M'),
        sourceUrl: buildYouTubeWatchUrl('sYZtOFzM78M'),
        previewUrl: buildYouTubePreviewUrl('sYZtOFzM78M'),
        groups: ['asia'],
        note: 'South Asia live desk.',
        language: 'EN',
        priority: 82,
    },
    {
        id: 'cnbc',
        name: 'CNBC',
        provider: 'CNBC',
        type: 'youtube',
        videoId: '9NyxcX3rhQs',
        streamUrl: buildYouTubeEmbedUrl('9NyxcX3rhQs'),
        sourceUrl: buildYouTubeWatchUrl('9NyxcX3rhQs'),
        previewUrl: buildYouTubePreviewUrl('9NyxcX3rhQs'),
        groups: ['business'],
        note: 'US business and macro programming.',
        language: 'EN',
        priority: 88,
    },
    {
        id: 'yahoo-finance',
        name: 'Yahoo Finance',
        provider: 'Yahoo Finance',
        type: 'youtube',
        videoId: 'KQp-e_XQnDE',
        streamUrl: buildYouTubeEmbedUrl('KQp-e_XQnDE'),
        sourceUrl: buildYouTubeWatchUrl('KQp-e_XQnDE'),
        previewUrl: buildYouTubePreviewUrl('KQp-e_XQnDE'),
        groups: ['business'],
        note: '24/7 market coverage and interviews.',
        language: 'EN',
        priority: 80,
    },
];

export function getRelayGroupForIntelRegion(intelRegion) {
    switch (intelRegion) {
        case 'iran':
        case 'mideast':
            return 'mideast';
        case 'europe':
            return 'europe';
        case 'asia':
            return 'asia';
        case 'americas':
            return 'breaking';
        default:
            return 'breaking';
    }
}

export function getRelayChannels(groupId) {
    return CURATED_NEWS_STREAMS
        .filter((channel) => channel.groups.includes(groupId))
        .sort((a, b) => b.priority - a.priority);
}
