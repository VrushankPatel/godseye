import { execFileSync } from 'node:child_process';

const output = execFileSync('bash', ['./scripts/feed_audit.sh'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

process.stdout.write(output);

const metrics = new Map();
for (const line of output.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('==') || trimmed.startsWith('Audit artifacts:')) continue;
  const [key, rawValue] = trimmed.split(/\s+/, 2);
  if (!key || !rawValue) continue;
  metrics.set(key, rawValue);
}

function toNumber(key) {
  const rawValue = metrics.get(key);
  if (!rawValue || rawValue === 'ERR') return null;
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : null;
}

const checks = [
  {
    label: 'Global flight coverage',
    pass: Math.max(
      toNumber('ADSB_ONE_GLOBAL') || 0,
      toNumber('AIRPLANES_LIVE_GLOBAL') || 0,
      toNumber('ADSB_LOL_GLOBAL') || 0,
      toNumber('OPENSKY_GLOBAL') || 0,
      toNumber('UNION_GLOBAL') || 0,
    ) >= 10,
  },
  {
    label: 'Satellite catalog coverage',
    pass: Math.max(
      toNumber('CELESTRAK_ACTIVE_RECORDS') || 0,
      toNumber('SATELLITE_MANIFEST_RECORDS') || 0,
      toNumber('CELESTRAK_COSMOS2251_DEBRIS') || 0,
      toNumber('CELESTRAK_FENGYUN1C_DEBRIS') || 0,
    ) >= 100,
  },
  {
    label: 'Seismic feed availability',
    pass: (toNumber('USGS_ALL_HOUR') || 0) >= 1,
  },
  {
    label: 'Global ports feed availability',
    pass: (toNumber('GLOBAL_PORTS_COUNT') || 0) >= 100,
  },
];

const failed = checks.filter((check) => !check.pass);
if (failed.length) {
  console.error('Feed smoke audit failed:', failed.map((check) => check.label).join(', '));
  process.exit(1);
}
