import fs from 'node:fs';
import path from 'node:path';
import { MemoryCache } from '../cache.mjs';

const frameCache = new MemoryCache(300);
const FRAME_TTL_MS = 6000; // 6 seconds

function generateOfflinePatternSvg(label = 'FEED OFFLINE', detail = 'SIGNAL LOST') {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070d0a"/>
      <stop offset="100%" stop-color="#020503"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00ff41" stroke-width="0.5" stroke-opacity="0.15"/>
    </pattern>
    <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
      <stop offset="60%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.8"/>
    </radialGradient>
  </defs>

  <!-- Background and grid -->
  <rect width="640" height="360" fill="url(#bg)"/>
  <rect width="640" height="360" fill="url(#grid)"/>
  <rect width="640" height="360" fill="url(#vignette)"/>

  <!-- Scanning line accents -->
  <line x1="0" y1="180" x2="640" y2="180" stroke="#00ff41" stroke-width="1" stroke-opacity="0.2"/>
  <line x1="320" y1="0" x2="320" y2="360" stroke="#00ff41" stroke-width="1" stroke-opacity="0.2"/>

  <!-- HUD Reticle Box -->
  <rect x="160" y="90" width="320" height="180" fill="#031008" fill-opacity="0.6" stroke="#00ff41" stroke-width="1.5" stroke-dasharray="8, 4"/>
  
  <!-- Corner brackets -->
  <path d="M 150 110 L 150 80 L 180 80" fill="none" stroke="#00ff41" stroke-width="2"/>
  <path d="M 490 110 L 490 80 L 460 80" fill="none" stroke="#00ff41" stroke-width="2"/>
  <path d="M 150 250 L 150 280 L 180 280" fill="none" stroke="#00ff41" stroke-width="2"/>
  <path d="M 490 250 L 490 280 L 460 280" fill="none" stroke="#00ff41" stroke-width="2"/>

  <!-- Center Cross -->
  <line x1="310" y1="180" x2="330" y2="180" stroke="#ff3333" stroke-width="2"/>
  <line x1="320" y1="170" x2="320" y2="190" stroke="#ff3333" stroke-width="2"/>

  <!-- Text -->
  <text x="320" y="150" font-family="monospace" font-size="16" font-weight="bold" fill="#ff4d4d" text-anchor="middle" letter-spacing="3">${escapeXml(label)}</text>
  <text x="320" y="175" font-family="monospace" font-size="12" fill="#88aa88" text-anchor="middle" letter-spacing="1.5">${escapeXml(detail)}</text>
  <text x="320" y="235" font-family="monospace" font-size="10" fill="#00ff41" text-anchor="middle" letter-spacing="1">SYSTEM RECONNECTING: ${escapeXml(timestamp)}</text>
</svg>`;
}

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function handleCctvFrame(req, res, searchParams) {
  const targetUrl = searchParams.get('url');
  const cameraId = searchParams.get('id') || 'CAM-STREAM';

  if (!targetUrl) {
    const svg = generateOfflinePatternSvg(cameraId, 'NO STREAM URL PROVIDED');
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(svg);
    return;
  }

  // Check frame cache
  const cached = frameCache.get(targetUrl);
  if (cached) {
    res.writeHead(200, {
      'Content-Type': cached.contentType,
      'Content-Length': cached.buffer.length,
      'X-Cache': 'HIT',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(cached.buffer);
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': targetUrl,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Upstream returned ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    frameCache.set(targetUrl, { buffer, contentType }, FRAME_TTL_MS);

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': buffer.length,
      'X-Cache': 'MISS',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(buffer);
  } catch (err) {
    const svg = generateOfflinePatternSvg(cameraId, err.message.substring(0, 30).toUpperCase());
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=5',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(svg);
  }
}

export function handleCctvSources(req, res) {
  // Load verified manifest if present
  const manifestPath = path.resolve(process.cwd(), 'public/data/verified-cctv-manifest.json');
  try {
    if (fs.existsSync(manifestPath)) {
      const data = fs.readFileSync(manifestPath, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(data);
      return;
    }
  } catch {
    // Fall through
  }

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify({ feeds: [], total: 0 }));
}

export function handleCctvHealth(req, res) {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify({
    status: 'healthy',
    activeCachedFrames: frameCache.size(),
    timestamp: new Date().toISOString(),
  }));
}
