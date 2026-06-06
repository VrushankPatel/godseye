import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CAMERA_FEEDS } from '../src/constants/staticData.js';
import { WORLDCAMS_FEEDS } from '../src/constants/worldcamsFeeds.js';
import {
  extractCaltransStreamUrl,
  getEffectiveCameraVideoUrl,
  isContinuousLiveCameraFeed,
  isHlsStreamUrl,
  mergeFeeds,
  normalize511Feeds,
  normalizeCaltransFeed,
  normalizeTflFeeds,
  prioritizeFeeds,
} from '../src/services/cctvFeeds.js';
import { normalizeNgaPortRows } from '../src/services/maritimePorts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const manifestsDir = path.join(repoRoot, 'public', 'manifests');
const CCTV_MANIFEST_PATH = path.join(manifestsDir, 'cctv-verified.json');
const INTEL_MANIFEST_PATH = path.join(manifestsDir, 'intel-wire.json');
const SATELLITE_MANIFEST_PATH = path.join(manifestsDir, 'satellite-active.json');
const MARITIME_PORTS_MANIFEST_PATH = path.join(manifestsDir, 'maritime-ports.json');

const FETCH_TIMEOUT_MS = 15_000;
const VERIFY_TIMEOUT_MS = 8_000;
const REVERIFY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_INTEL_ITEMS = 80;
const MAX_CCTV_WORLD_FEEDS = 2500;
const CCTV_VERIFY_CONCURRENCY = 16;
const CALTRANS_STREAM_RESOLUTION_LIMIT = 180;
const NGA_WORLD_PORT_INDEX_URL = 'https://msi.nga.mil/api/publications/world-port-index?output=json';
const INVALID_OPTIONAL_KEY_VALUES = new Set(['', '-', 'test', 'demo', 'placeholder', 'changeme', 'replace-me', 'your_key_here', 'your-api-key', 'undefined', 'null', 'false', '0']);
const INTEL_RSS_SOURCES = [
  { name: 'Google News World', url: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en' },
  { name: 'Google News Military', url: 'https://news.google.com/rss/search?q=military%20OR%20defense%20OR%20conflict&hl=en-US&gl=US&ceid=US:en' },
  { name: 'Google News Energy', url: 'https://news.google.com/rss/search?q=oil%20OR%20shipping%20OR%20hormuz&hl=en-US&gl=US&ceid=US:en' },
  { name: 'Reuters World', url: 'https://feeds.reuters.com/reuters/worldNews' },
  { name: 'Reuters Top', url: 'https://feeds.reuters.com/reuters/topNews' },
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'Defense One', url: 'https://www.defenseone.com/rss/all/' },
];

function hasUsableOptionalKey(value) {
  return !INVALID_OPTIONAL_KEY_VALUES.has(String(value || '').trim().toLowerCase());
}

function withTimeout(ms = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

async function fetchText(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const { signal, clear } = withTimeout(timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'Godseye Manifest Builder/1.0' },
      redirect: 'follow',
      signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clear();
  }
}

async function fetchJson(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const text = await fetchText(url, timeoutMs);
  return JSON.parse(text);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function decodeXml(text = '') {
  return String(text)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function readXmlTag(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i'));
  return decodeXml(match?.[1] || '').replace(/\s+/g, ' ').trim();
}

function readAtomLink(block) {
  const hrefMatch = block.match(/<link[^>]+href="([^"]+)"/i);
  return decodeXml(hrefMatch?.[1] || '').trim();
}

function parseFeedItems(xml, sourceName) {
  const items = [];
  const rssBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  const atomBlocks = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  const blocks = rssBlocks.length ? rssBlocks : atomBlocks;

  for (const [index, block] of blocks.entries()) {
    const title = readXmlTag(block, 'title');
    const link = readXmlTag(block, 'link') || readAtomLink(block);
    const publishedRaw =
      readXmlTag(block, 'pubDate') ||
      readXmlTag(block, 'published') ||
      readXmlTag(block, 'updated');
    const publishedAt = Date.parse(publishedRaw || '') || 0;
    const itemSource = readXmlTag(block, 'source') || sourceName;
    if (!title || !link) continue;
    items.push({
      id: `${sourceName}-${index}-${title.slice(0, 32)}`,
      source: itemSource,
      title,
      link,
      publishedAt,
    });
  }

  return items;
}

async function buildIntelManifest(existingManifest) {
  const guardianKey = hasUsableOptionalKey(process.env.VITE_GUARDIAN_API_KEY)
    ? String(process.env.VITE_GUARDIAN_API_KEY || '').trim()
    : '';
  const allItems = [];
  const seen = new Set();

  const ingest = (items) => {
    for (const item of items || []) {
      const dedupeKey = `${item.link}::${item.title}`;
      if (!item?.title || !item?.link || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      allItems.push(item);
    }
  };

  const rssResults = await Promise.allSettled(
    INTEL_RSS_SOURCES.map(async (source) => parseFeedItems(await fetchText(source.url), source.name))
  );

  for (const result of rssResults) {
    if (result.status === 'fulfilled') ingest(result.value);
  }

  try {
    const hn = await fetchJson('https://hn.algolia.com/api/v1/search?query=military%20conflict&tags=story');
    ingest((hn?.hits || []).map((hit) => ({
      id: `hn-${hit.objectID || hit.url}`,
      source: 'Hacker News',
      title: String(hit.title || hit.story_title || '').trim(),
      link: String(hit.url || hit.story_url || '').trim(),
      publishedAt: Date.parse(hit.created_at || '') || 0,
    })));
  } catch {
    // Keep manifest build resilient.
  }

  if (guardianKey) {
    try {
      const guardian = await fetchJson(
        `https://content.guardianapis.com/search?q=${encodeURIComponent('military conflict OR geopolitics')}&api-key=${guardianKey}&page-size=20&show-fields=headline`
      );
      ingest((guardian?.response?.results || []).map((result) => ({
        id: `guardian-${result.id || result.webUrl}`,
        source: `Guardian ${result.sectionName || 'World'}`.trim(),
        title: String(result?.fields?.headline || result.webTitle || '').trim(),
        link: String(result.webUrl || '').trim(),
        publishedAt: Date.parse(result.webPublicationDate || '') || 0,
      })));
    } catch {
      // Keep manifest build resilient.
    }
  }

  const items = allItems
    .filter((item) => item.title && item.link)
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, MAX_INTEL_ITEMS);

  if (items.length < 8 && existingManifest?.items?.length) {
    return {
      ...existingManifest,
      retainedAt: new Date().toISOString(),
      retainedReason: 'Fresh upstream manifest generation did not produce enough items.',
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceCount: INTEL_RSS_SOURCES.length + 1 + (guardianKey ? 1 : 0),
    itemCount: items.length,
    items,
  };
}

function parseTleText(text) {
  const records = [];
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = 0; index < lines.length; index += 3) {
    const name = lines[index];
    const line1 = lines[index + 1];
    const line2 = lines[index + 2];
    if (!line1?.startsWith('1 ') || !line2?.startsWith('2 ')) continue;
    const id = line1.slice(2, 7).trim() || `SAT-${records.length + 1}`;
    records.push({
      id,
      name: name || `SAT-${id}`,
      line1,
      line2,
    });
  }

  return records;
}

async function buildSatelliteManifest(existingManifest) {
  try {
    const tleText = await fetchText('https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle', 25_000);
    const records = parseTleText(tleText);
    if (records.length < 100 && existingManifest?.records?.length) {
      return {
        ...existingManifest,
        retainedAt: new Date().toISOString(),
        retainedReason: 'Fresh CelesTrak fetch returned insufficient active records.',
      };
    }
    return {
      generatedAt: new Date().toISOString(),
      source: 'CelesTrak Active',
      recordCount: records.length,
      records,
    };
  } catch {
    return existingManifest || {
      generatedAt: new Date().toISOString(),
      source: 'CelesTrak Active',
      recordCount: 0,
      records: [],
    };
  }
}

async function buildMaritimePortsManifest(existingManifest) {
  try {
    const payload = await fetchJson(NGA_WORLD_PORT_INDEX_URL, 30_000);
    const ports = normalizeNgaPortRows(payload);
    if (ports.length < 100 && existingManifest?.ports?.length) {
      return {
        ...existingManifest,
        retainedAt: new Date().toISOString(),
        retainedReason: 'Fresh NGA World Port Index fetch returned insufficient records.',
      };
    }

    return {
      generatedAt: new Date().toISOString(),
      source: 'NGA Maritime Safety World Port Index',
      sourceUrl: NGA_WORLD_PORT_INDEX_URL,
      recordCount: ports.length,
      ports,
    };
  } catch {
    return existingManifest || {
      generatedAt: new Date().toISOString(),
      source: 'NGA Maritime Safety World Port Index',
      sourceUrl: NGA_WORLD_PORT_INDEX_URL,
      recordCount: 0,
      ports: [],
    };
  }
}

function getVerificationFingerprint(feed) {
  return [feed.url || '', feed.videoUrl || '', feed.fallbackUrl || '', feed.detailsUrl || ''].join('|');
}

function extractYouTubeWatchUrl(videoUrl) {
  const match = String(videoUrl || '').match(/(?:embed\/|watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? `https://www.youtube.com/watch?v=${match[1]}` : '';
}

function unwrapWorldcamsPlayer(url) {
  try {
    const parsed = new URL(String(url || ''));
    if (!parsed.hostname.includes('worldcams.tv') || !parsed.pathname.includes('/player')) return '';
    return parsed.searchParams.get('url') || '';
  } catch {
    return '';
  }
}

async function verifyHttpReachable(url) {
  if (!url) return false;
  const { signal, clear } = withTimeout(VERIFY_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'user-agent': 'Godseye Manifest Builder/1.0' },
      signal,
    });
    if (response.ok) return true;
  } catch {
    // Fall through to GET.
  } finally {
    clear();
  }

  const retry = withTimeout(VERIFY_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'user-agent': 'Godseye Manifest Builder/1.0', range: 'bytes=0-0' },
      signal: retry.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    retry.clear();
  }
}

async function verifyYouTubeFeed(feed) {
  const watchUrl = extractYouTubeWatchUrl(feed.videoUrl);
  if (!watchUrl) return null;

  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
    const data = await fetchJson(url, VERIFY_TIMEOUT_MS);
    return {
      verificationStatus: data?.title ? 'verified' : 'stale',
      verifiedTransport: 'youtube_oembed',
    };
  } catch {
    return {
      verificationStatus: 'stale',
      verifiedTransport: 'youtube_oembed',
    };
  }
}

async function verifyWorldcamsPlayer(feed) {
  const nested = unwrapWorldcamsPlayer(feed.videoUrl);
  if (!nested) return null;
  const ok = await verifyHttpReachable(nested);
  return {
    verificationStatus: ok ? 'verified' : 'stale',
    verifiedTransport: nested.toLowerCase().includes('.m3u8') ? 'hls' : 'embed',
    resolvedVideoUrl: ok ? nested : null,
    continuousLive: ok && isHlsStreamUrl(nested),
  };
}

async function verifyGenericFeed(feed) {
  const primaryUrl = feed.resolvedVideoUrl || feed.videoUrl || feed.url || feed.fallbackUrl || '';
  const ok = await verifyHttpReachable(primaryUrl);
  return {
    verificationStatus: ok ? 'verified' : 'stale',
    verifiedTransport: feed.mediaType || 'unknown',
  };
}

function hasPlausibleMediaUrl(feed) {
  const candidate = String(
    feed.resolvedVideoUrl ||
    feed.videoUrl ||
    feed.url ||
    feed.fallbackUrl ||
    ''
  ).trim();
  if (!candidate) return false;

  try {
    const parsed = new URL(candidate);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

async function enrichCaltransFeeds(feeds) {
  const prioritized = feeds.slice(0, CALTRANS_STREAM_RESOLUTION_LIMIT);
  const enrichedPriority = await runWithConcurrency(
    prioritized,
    10,
    async (feed) => {
      const nextFeed = { ...feed };
      if (feed.streamCapable && feed.detailsUrl) {
        try {
          const html = await fetchText(feed.detailsUrl, VERIFY_TIMEOUT_MS);
          const streamUrl = extractCaltransStreamUrl(html);
          if (streamUrl) {
            nextFeed.resolvedVideoUrl = streamUrl;
            nextFeed.videoUrl = streamUrl;
            nextFeed.mediaType = 'video';
          }
        } catch {
          // Keep the still image feed.
        }
      }
      nextFeed.verificationStatus = 'verified';
      nextFeed.verifiedTransport = nextFeed.mediaType || 'image';
      nextFeed.continuousLive = isContinuousLiveCameraFeed(nextFeed);
      nextFeed.lastVerifiedAt = new Date().toISOString();
      return nextFeed;
    }
  );

  const untouched = feeds.slice(CALTRANS_STREAM_RESOLUTION_LIMIT).map((feed) => ({
    ...feed,
    verificationStatus: 'catalog_verified',
    verifiedTransport: feed.mediaType || 'image',
    continuousLive: false,
    lastVerifiedAt: new Date().toISOString(),
  }));

  return [...enrichedPriority, ...untouched];
}

async function runWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function runner() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runner())
  );
  return results;
}

async function buildCctvManifest(existingManifest) {
  const previousById = new Map(
    Array.isArray(existingManifest?.feeds)
      ? existingManifest.feeds.map((feed) => [feed.id, feed])
      : []
  );

  const [caltransText, ontario, alberta, tfl] = await Promise.allSettled([
    fetchText('https://cwwp2.dot.ca.gov/vm/js/cctv08.js'),
    fetchJson('https://511on.ca/api/v2/get/cameras'),
    fetchJson('https://511.alberta.ca/api/v2/get/cameras'),
    fetchJson('https://api.tfl.gov.uk/Place/Type/JamCam'),
  ]);

  const caltransFeeds = caltransText.status === 'fulfilled'
    ? await enrichCaltransFeeds(normalizeCaltransFeed(caltransText.value, 2400))
    : [];
  const ontarioFeeds = ontario.status === 'fulfilled'
    ? normalize511Feeds(ontario.value, 'Ontario 511', 'Ontario', 850, 'https://511on.ca').map((feed) => ({
        ...feed,
        verificationStatus: 'verified',
        verifiedTransport: feed.mediaType,
        continuousLive: false,
        lastVerifiedAt: new Date().toISOString(),
      }))
    : [];
  const albertaFeeds = alberta.status === 'fulfilled'
    ? normalize511Feeds(alberta.value, 'Alberta 511', 'Alberta', 800, 'https://511.alberta.ca').map((feed) => ({
        ...feed,
        verificationStatus: 'verified',
        verifiedTransport: feed.mediaType,
        continuousLive: false,
        lastVerifiedAt: new Date().toISOString(),
      }))
    : [];
  const tflFeeds = tfl.status === 'fulfilled'
    ? normalizeTflFeeds(tfl.value, 850).map((feed) => ({
        ...feed,
        verificationStatus: 'verified',
        verifiedTransport: feed.mediaType,
        continuousLive: false,
        lastVerifiedAt: new Date().toISOString(),
      }))
    : [];

  const seedCandidates = mergeFeeds([CAMERA_FEEDS]);
  const worldcamsCandidates = WORLDCAMS_FEEDS.slice(0, MAX_CCTV_WORLD_FEEDS);
  const worldcamsLiveCandidates = worldcamsCandidates.filter((feed) => {
    const nested = unwrapWorldcamsPlayer(feed.videoUrl);
    return isHlsStreamUrl(nested || getEffectiveCameraVideoUrl(feed));
  });

  const verifiedSeeds = await runWithConcurrency(
    seedCandidates,
    CCTV_VERIFY_CONCURRENCY,
    async (feed) => {
      const previous = previousById.get(feed.id);
      const fingerprint = getVerificationFingerprint(feed);
      if (
        previous &&
        previous.verificationFingerprint === fingerprint &&
        previous.lastVerifiedAt &&
        Date.now() - Date.parse(previous.lastVerifiedAt) < REVERIFY_WINDOW_MS
      ) {
        return {
          ...feed,
          ...previous,
          verificationFingerprint: fingerprint,
        };
      }

      let verification = null;
      if (String(feed.videoUrl || '').includes('youtube.com/')) {
        verification = await verifyYouTubeFeed(feed);
      } else if (String(feed.videoUrl || '').includes('worldcams.tv/player')) {
        verification = await verifyWorldcamsPlayer(feed);
      } else {
        verification = await verifyGenericFeed(feed);
      }

      return {
        ...feed,
        ...verification,
        continuousLive: Boolean(verification?.continuousLive || isContinuousLiveCameraFeed({ ...feed, ...verification })),
        verificationFingerprint: fingerprint,
        lastVerifiedAt: new Date().toISOString(),
      };
    }
  );

  const verifiedWorldcamsLive = await runWithConcurrency(
    worldcamsLiveCandidates,
    CCTV_VERIFY_CONCURRENCY,
    async (feed) => {
      const previous = previousById.get(feed.id);
      const fingerprint = getVerificationFingerprint(feed);
      if (
        previous &&
        previous.verificationFingerprint === fingerprint &&
        previous.lastVerifiedAt &&
        Date.now() - Date.parse(previous.lastVerifiedAt) < REVERIFY_WINDOW_MS &&
        isContinuousLiveCameraFeed(previous)
      ) {
        return {
          ...feed,
          ...previous,
          verificationFingerprint: fingerprint,
        };
      }

      const verification = await verifyWorldcamsPlayer(feed);
      return {
        ...feed,
        ...verification,
        mediaType: 'video',
        streamCapable: Boolean(verification?.continuousLive),
        verificationFingerprint: fingerprint,
        lastVerifiedAt: new Date().toISOString(),
      };
    }
  );

  const liveWorldcamIds = new Set(worldcamsLiveCandidates.map((feed) => feed.id));
  const catalogWorldcams = worldcamsCandidates
    .filter((feed) => !liveWorldcamIds.has(feed.id))
    .map((feed) => {
      const previous = previousById.get(feed.id);
      const fingerprint = getVerificationFingerprint(feed);
      if (
        previous &&
        previous.verificationFingerprint === fingerprint &&
        previous.lastVerifiedAt &&
        Date.now() - Date.parse(previous.lastVerifiedAt) < REVERIFY_WINDOW_MS
      ) {
        return {
          ...feed,
          ...previous,
          verificationFingerprint: fingerprint,
        };
      }

      return {
        ...feed,
        verificationFingerprint: fingerprint,
        verificationStatus: hasPlausibleMediaUrl(feed) ? 'catalog_verified' : 'stale',
        verifiedTransport: feed.mediaType || 'embed',
        continuousLive: false,
        lastVerifiedAt: new Date().toISOString(),
      };
    })
    .filter((feed) => feed.verificationStatus !== 'stale');

  const merged = prioritizeFeeds(
    mergeFeeds([
      caltransFeeds,
      ontarioFeeds,
      albertaFeeds,
      tflFeeds,
      verifiedSeeds.filter((feed) => feed.verificationStatus !== 'stale'),
      verifiedWorldcamsLive.filter((feed) => feed.verificationStatus !== 'stale'),
      catalogWorldcams,
    ])
  );

  if (!merged.length && existingManifest?.feeds?.length) {
    return {
      ...existingManifest,
      retainedAt: new Date().toISOString(),
      retainedReason: 'Fresh CCTV manifest generation did not yield any playable feeds.',
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    feedCount: merged.length,
    verifiedCount: merged.filter((feed) => feed.verificationStatus === 'verified').length,
    catalogCount: merged.filter((feed) => feed.verificationStatus === 'catalog_verified').length,
    continuousLiveCount: merged.filter(isContinuousLiveCameraFeed).length,
    feeds: merged,
  };
}

async function main() {
  await ensureDir(manifestsDir);

  const [existingIntel, existingSatellite, existingCctv, existingMaritimePorts] = await Promise.all([
    readJsonIfExists(INTEL_MANIFEST_PATH),
    readJsonIfExists(SATELLITE_MANIFEST_PATH),
    readJsonIfExists(CCTV_MANIFEST_PATH),
    readJsonIfExists(MARITIME_PORTS_MANIFEST_PATH),
  ]);

  const [intelManifest, satelliteManifest, cctvManifest, maritimePortsManifest] = await Promise.all([
    buildIntelManifest(existingIntel),
    buildSatelliteManifest(existingSatellite),
    buildCctvManifest(existingCctv),
    buildMaritimePortsManifest(existingMaritimePorts),
  ]);

  await Promise.all([
    writeJson(INTEL_MANIFEST_PATH, intelManifest),
    writeJson(SATELLITE_MANIFEST_PATH, satelliteManifest),
    writeJson(CCTV_MANIFEST_PATH, cctvManifest),
    writeJson(MARITIME_PORTS_MANIFEST_PATH, maritimePortsManifest),
  ]);

  process.stdout.write(
    [
      `INTEL_MANIFEST_ITEMS ${intelManifest?.itemCount || intelManifest?.items?.length || 0}`,
      `SATELLITE_MANIFEST_RECORDS ${satelliteManifest?.recordCount || satelliteManifest?.records?.length || 0}`,
      `CCTV_MANIFEST_FEEDS ${cctvManifest?.feedCount || cctvManifest?.feeds?.length || 0}`,
      `MARITIME_PORTS_MANIFEST_RECORDS ${maritimePortsManifest?.recordCount || maritimePortsManifest?.ports?.length || 0}`,
    ].join('\n') + '\n'
  );
}

main().catch((error) => {
  console.error('[manifests] refresh failed:', error);
  process.exit(1);
});
