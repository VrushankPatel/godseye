/**
 * Radio Station Directory and Tuner Geometry Engine
 */

export const RADIO_CATEGORY_COLORS = {
  all: '#b9fbff',
  news: '#44adff',
  music: '#00ff95',
  talk: '#f2b84b',
  weather: '#ff5c78',
  'public-safety': '#ff8b4a',
  electronic: '#a87cff',
  classic: '#e0b0ff',
};

export const COMMON_GENRE_TAGS = [
  { id: 'all', label: 'All Genres' },
  { id: 'news', label: 'News & Info' },
  { id: 'talk', label: 'Talk & Discussion' },
  { id: 'bollywood', label: 'Bollywood & Hindi' },
  { id: 'pop', label: 'Pop & Top 40' },
  { id: 'rock', label: 'Rock & Indie' },
  { id: 'electronic', label: 'Electronic & Ambient' },
  { id: 'jazz', label: 'Jazz & Blues' },
  { id: 'classical', label: 'Classical' },
];

/**
 * Build a bounded virtual tuner tape around one continuous directory coordinate.
 * Mirrors the vintage analog frequency tuner scale calculation.
 */
export function buildRadioTunerTicks(coordinate, stationCount, width, {
  insetPx = 7,
  minPitchPx = 14,
  speedFactor = 5,
  overscan = 2,
  labelStep = 5,
} = {}) {
  const count = Math.max(0, Math.floor(Number(stationCount) || 0));
  const dialWidth = Math.max(0, Number(width) || 0);
  const inset = Math.max(0, Number(insetPx) || 0);
  const usableWidth = Math.max(0, dialWidth - inset * 2);

  if (!count) return { ticks: [], needleX: inset, pitchPx: 0, ratio: 0 };
  const value = Math.min(count - 1, Math.max(0, Number(coordinate) || 0));

  if (count === 1) {
    return {
      ticks: [{ stationIndex: 0, channel: 1, xPx: inset + usableWidth / 2, current: true, label: '01' }],
      needleX: inset + usableWidth / 2,
      pitchPx: Math.max(1, Number(minPitchPx) || 14),
      ratio: 0.5,
    };
  }

  const directoryStep = usableWidth / (count - 1);
  const pitchPx = Math.max(
    Math.max(1, Number(minPitchPx) || 14),
    directoryStep * Math.max(1, Number(speedFactor) || 5)
  );
  const needleX = inset + directoryStep * value;
  const overscanPx = pitchPx * Math.max(0, Number(overscan) || 0);
  const first = Math.max(0, Math.ceil(value + (-overscanPx - needleX) / pitchPx));
  const last = Math.min(count - 1, Math.floor(value + (dialWidth + overscanPx - needleX) / pitchPx));
  const currentIndex = Math.min(count - 1, Math.max(0, Math.floor(value + 0.5)));
  const majorEvery = Math.max(1, Math.floor(Number(labelStep) || 5));
  const labelWidth = Math.max(2, String(count).length);
  const ticks = [];

  for (let stationIndex = first; stationIndex <= last; stationIndex += 1) {
    const channel = stationIndex + 1;
    const current = stationIndex === currentIndex;
    const labelled = current || stationIndex === 0 || stationIndex === count - 1 || channel % majorEvery === 0;
    ticks.push({
      stationIndex,
      channel,
      xPx: needleX + pitchPx * (stationIndex - value),
      current,
      label: labelled ? String(channel).padStart(labelWidth, '0') : '',
    });
  }

  return { ticks, needleX, pitchPx, ratio: value / (count - 1) };
}

let _catalogCache = null;

export async function fetchRadioStations({ country = 'all', tag = 'all', search = '', limit = 500, forceRefresh = false } = {}) {
  const params = new URLSearchParams();
  if (country && country !== 'all') params.set('country', country);
  if (tag && tag !== 'all') params.set('tag', tag);
  if (search) params.set('search', search);
  if (limit) params.set('limit', String(limit));

  const url = `/api/radio/stations?${params.toString()}`;

  if (!forceRefresh && _catalogCache && _catalogCache.url === url && Date.now() - _catalogCache.time < 60000) {
    return _catalogCache.data;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Radio fetch failed with status ${response.status}`);
  }

  const data = await response.json();
  _catalogCache = {
    url,
    time: Date.now(),
    data,
  };

  return data;
}

export function getStationCategoryColor(station) {
  if (!station || !station.tags) return RADIO_CATEGORY_COLORS.all;
  const tags = Array.isArray(station.tags) ? station.tags : [];
  for (const t of tags) {
    const lower = t.toLowerCase();
    if (lower.includes('news')) return RADIO_CATEGORY_COLORS.news;
    if (lower.includes('talk')) return RADIO_CATEGORY_COLORS.talk;
    if (lower.includes('emergency') || lower.includes('police')) return RADIO_CATEGORY_COLORS['public-safety'];
    if (lower.includes('electronic') || lower.includes('ambient') || lower.includes('techno')) return RADIO_CATEGORY_COLORS.electronic;
    if (lower.includes('classic')) return RADIO_CATEGORY_COLORS.classic;
    if (lower.includes('music') || lower.includes('pop') || lower.includes('bollywood')) return RADIO_CATEGORY_COLORS.music;
  }
  return RADIO_CATEGORY_COLORS.all;
}
