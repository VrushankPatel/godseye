const CAPABILITIES = [
  {
    id: 'google_3d_tiles',
    label: 'Google Photorealistic 3D tiles',
    keys: ['VITE_GOOGLE_MAPS_3D_KEY', 'VITE_GOOGLE_MAPS_API_KEY'],
    required: false,
    mode: 'any',
  },
  {
    id: 'mapbox_tokens',
    label: 'Mapbox tiles / tokenized overlays',
    keys: ['VITE_MAPBOX_ACCESS_TOKEN'],
    required: false,
    mode: 'any',
  },
  {
    id: 'youtube_discovery',
    label: 'YouTube live CCTV discovery',
    keys: ['VITE_YOUTUBE_API_KEY'],
    required: false,
    mode: 'any',
  },
  {
    id: 'guardian_intel',
    label: 'Guardian intel enrichment',
    keys: ['VITE_GUARDIAN_API_KEY'],
    required: false,
    mode: 'any',
  },
  {
    id: 'aisstream_live',
    label: 'AIS live maritime tracking',
    keys: ['VITE_AISSTREAM_API_KEY'],
    required: false,
    mode: 'any',
  },
  {
    id: 'shared_rtdb_cache',
    label: 'Shared Firebase RTDB cache',
    keys: ['VITE_FIREBASE_RTDB_URL', 'VITE_GODSEYE_CACHE_SECRET'],
    required: false,
    mode: 'all',
  },
];
const INVALID_OPTIONAL_KEY_VALUES = new Set(['', '-', 'test', 'demo', 'placeholder', 'changeme', 'replace-me', 'your_key_here', 'your-api-key', 'undefined', 'null', 'false', '0']);

function normalizeValue(value) {
  const text = String(value || '').trim().replace(/^['"]+|['"]+$/g, '');
  if (!text) return '';
  if (/^\$\{\{\s*secrets\./.test(text)) return '';
  if (INVALID_OPTIONAL_KEY_VALUES.has(text.toLowerCase())) return '';
  return text;
}

function resolveCapability(env, capability) {
  const mode = capability.mode || 'any';
  const providedKeys = capability.keys.filter((key) => normalizeValue(env[key]));
  const providedKey = mode === 'all'
    ? (providedKeys.length === capability.keys.length ? providedKeys.join(', ') : '—')
    : (providedKeys[0] || '—');
  const value = mode === 'all'
    ? (providedKeys.length === capability.keys.length ? 'configured' : '')
    : (providedKeys[0] ? normalizeValue(env[providedKeys[0]]) : '');
  return {
    ...capability,
    providedKey: providedKey || '—',
    available: Boolean(value),
    maskedValue: value ? `${value.slice(0, 4)}…${value.slice(-4)}` : '—',
  };
}

const strictMode = process.argv.includes('--strict') || process.env.ENV_AUDIT_STRICT === '1';
const report = CAPABILITIES.map((capability) => resolveCapability(process.env, capability));

console.log('Godseye capability matrix');
console.table(report.map((row) => ({
  capability: row.label,
  keys: row.keys.join(' | '),
  status: row.available ? 'present' : 'missing',
  source: row.providedKey,
  sample: row.maskedValue,
  required: row.required ? 'yes' : 'no',
})));

const missingRequired = report.filter((row) => row.required && !row.available);
if (strictMode && missingRequired.length) {
  console.error('Missing required environment capabilities:', missingRequired.map((row) => row.label).join(', '));
  process.exit(1);
}
