import fs from 'node:fs';
import path from 'node:path';
import { CACHE_DIR } from '../cache.mjs';

const TOMTOM_DISK_DIR = path.join(CACHE_DIR, 'tomtom');
try {
  fs.mkdirSync(TOMTOM_DISK_DIR, { recursive: true });
} catch {
  // Ignore
}

let _dailyCount = 0;
let _currentDayKey = getUtcDayKey();
const DEFAULT_BUDGET = 2500;

function getUtcDayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function checkDayRollover() {
  const today = getUtcDayKey();
  if (today !== _currentDayKey) {
    _currentDayKey = today;
    _dailyCount = 0;
  }
}

function getTomTomKey() {
  return process.env.TOMTOM_API_KEY || process.env.VITE_TOMTOM_API_KEY || '';
}

function getTomTomBudget() {
  const custom = Number(process.env.TOMTOM_DAILY_BUDGET);
  return Number.isFinite(custom) && custom > 0 ? custom : DEFAULT_BUDGET;
}

export function handleTrafficStatus(req, res) {
  checkDayRollover();
  const key = getTomTomKey();
  const budget = getTomTomBudget();

  const response = {
    hasKey: Boolean(key),
    mode: key ? 'live' : 'sim',
    dailyCount: _dailyCount,
    budget,
    date: _currentDayKey,
  };

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(response));
}

export async function handleTrafficFlowTile(req, res, z, x, y) {
  checkDayRollover();
  const key = getTomTomKey();
  const budget = getTomTomBudget();

  if (!key) {
    res.writeHead(404, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ mode: 'sim', error: 'No TomTom API key configured' }));
    return;
  }

  const zoom = Number(z);
  const col = Number(x);
  const row = Number(y);

  if (!Number.isInteger(zoom) || !Number.isInteger(col) || !Number.isInteger(row) || zoom < 0 || zoom > 22) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid tile coordinates' }));
    return;
  }

  if (_dailyCount >= budget) {
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Retry-After': '3600',
    });
    res.end(JSON.stringify({ error: 'Daily TomTom traffic budget reached', mode: 'sim' }));
    return;
  }

  const tileKey = `${zoom}_${col}_${row}`;
  const diskPath = path.join(TOMTOM_DISK_DIR, `${tileKey}.pbf`);

  // Check 2-minute cache
  try {
    if (fs.existsSync(diskPath)) {
      const stat = fs.statSync(diskPath);
      if (Date.now() - stat.mtimeMs < 120_000) {
        const buffer = fs.readFileSync(diskPath);
        res.writeHead(200, {
          'Content-Type': 'application/x-protobuf',
          'Content-Length': buffer.length,
          'X-Cache': 'HIT-DISK',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(buffer);
        return;
      }
    }
  } catch {
    // Ignore cache read errors
  }

  // Upstream fetch
  const upstreamUrl = `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/${zoom}/${col}/${row}.pbf?key=${encodeURIComponent(key)}&trafficModelId=-1`;

  try {
    _dailyCount += 1;
    const response = await fetch(upstreamUrl, {
      headers: {
        'Accept': 'application/x-protobuf',
        'User-Agent': 'GodsEye-Console/1.0',
      },
    });

    if (!response.ok) {
      res.writeHead(response.status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ error: `TomTom upstream responded ${response.status}` }));
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to disk cache
    try {
      fs.writeFileSync(diskPath, buffer);
    } catch {
      // Ignore
    }

    res.writeHead(200, {
      'Content-Type': 'application/x-protobuf',
      'Content-Length': buffer.length,
      'X-Cache': 'MISS',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(buffer);
  } catch (err) {
    res.writeHead(502, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ error: 'Failed to fetch TomTom flow tile', details: err.message }));
  }
}
