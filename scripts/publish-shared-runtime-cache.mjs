import { readFile, writeFile, rm } from 'node:fs/promises';
import { webcrypto as crypto } from 'node:crypto';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';

const SHARED_CACHE_MAX_AGE_MS = 90 * 60 * 1000;
const CACHE_PATH = 'godsEyeData.json';
const CACHE_SCHEMA_VERSION = 'gdx-cache-v1';
const HASH_NAMESPACE = 'godseye.integrity.v1';
const DEBUG_PREFIX = '[GodseyeCachePublish]';
const execFileAsync = promisify(execFile);

function log(message, payload) {
  if (payload === undefined) {
    console.log(`${DEBUG_PREFIX} ${message}`);
    return;
  }
  console.log(`${DEBUG_PREFIX} ${message}`, payload);
}

function readEnvValue(keys) {
  const normalized = Array.isArray(keys) ? keys : [keys];
  for (const key of normalized) {
    const value = String(process.env[key] || '').trim();
    if (value) return value;
  }
  return '';
}

function isIpv4Address(value) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(String(value || '').trim());
}

function normalizeDbUrl(rawValue) {
  const trimmed = String(rawValue || '').trim().replace(/^['"]+|['"]+$/g, '');
  if (!trimmed) return '';

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const entries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(',')}}`;
}

function base64FromBytes(bytes) {
  return Buffer.from(bytes).toString('base64');
}

async function sha256Bytes(dataBytes) {
  const digest = await crypto.subtle.digest('SHA-256', dataBytes);
  return new Uint8Array(digest);
}

async function deriveKey(secret, saltBytes, usage) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 120000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: usage === 'sign' ? 'HMAC' : 'AES-GCM', ...(usage === 'sign' ? { hash: 'SHA-256', length: 256 } : { length: 256 }) },
    false,
    usage === 'sign' ? ['sign'] : ['encrypt', 'decrypt']
  );
}

async function computeCustomHash(data, secret) {
  const canonical = stableStringify(data);
  const secretSalt = await sha256Bytes(new TextEncoder().encode(`${HASH_NAMESPACE}:${secret}`));
  const hmacKey = await deriveKey(secret, secretSalt.subarray(0, 16), 'sign');
  const signature = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(canonical));
  const digest = base64FromBytes(new Uint8Array(signature))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `GDX-${digest.slice(0, 16)}-${digest.slice(16, 32)}-${digest.slice(32, 48)}`;
}

async function encryptDataObject(data, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(secret, salt, 'encrypt');
  const plaintext = new TextEncoder().encode(stableStringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    algorithm: 'AES-GCM',
    encoding: 'base64',
    iv: base64FromBytes(iv),
    salt: base64FromBytes(salt),
    payload: base64FromBytes(new Uint8Array(ciphertext)),
  };
}

async function readJsonFile(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function buildPayload(rootDir) {
  const intelWire = await readJsonFile(resolve(rootDir, 'public/manifests/intel-wire.json'));
  const cctvManifest = await readJsonFile(resolve(rootDir, 'public/manifests/cctv-verified.json'));
  const satelliteManifest = await readJsonFile(resolve(rootDir, 'public/manifests/satellite-active.json'));

  return {
    version: CACHE_SCHEMA_VERSION,
    generatedAt: Date.now(),
    maxAgeMs: SHARED_CACHE_MAX_AGE_MS,
    intelWire,
    cctvManifest,
    satelliteManifest,
  };
}

async function resolveHostViaGoogleDns(hostname) {
  try {
    const { stdout } = await execFileAsync('curl', [
      '--retry', '2',
      '--retry-delay', '1',
      '-sS',
      'https://dns.google/resolve?name=' + encodeURIComponent(hostname) + '&type=A',
    ], {
      maxBuffer: 1024 * 1024,
    });
    const payload = JSON.parse(stdout);
    const answer = Array.isArray(payload?.Answer)
      ? payload.Answer.find((entry) => entry?.type === 1 && entry?.data)
      : null;
    return String(answer?.data || '').trim();
  } catch {
    return '';
  }
}

async function putJsonWithCurl(url, body) {
  const payload = JSON.stringify(body);
  const tempFile = resolve(tmpdir(), `godseye-cache-publish-${Date.now()}.json`);
  await writeFile(tempFile, payload, 'utf8');
  try {
    const parsedUrl = new URL(url);
    const forcedIp = readEnvValue(['FIREBASE_RTDB_RESOLVE_IP', 'VITE_FIREBASE_RTDB_RESOLVE_IP']);
    const resolvedIp = isIpv4Address(forcedIp) ? forcedIp : await resolveHostViaGoogleDns(parsedUrl.hostname);
    const curlArgs = [
      '--retry', '3',
      '--retry-delay', '1',
      '-sS',
      '-f',
      '-X', 'PUT',
      '-H', 'content-type: application/json',
      '--data-binary', `@${tempFile}`,
    ];
    if (resolvedIp) {
      curlArgs.push('--resolve', `${parsedUrl.hostname}:443:${resolvedIp}`);
    }
    curlArgs.push(url);
    const { stdout } = await execFileAsync('curl', curlArgs, {
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout;
  } finally {
    await rm(tempFile, { force: true }).catch(() => {});
  }
}

async function publishWithBestEffort(url, body) {
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`RTDB publish failed with HTTP ${response.status}`);
    }
    return;
  } catch (error) {
    log(`Native fetch publish failed, retrying with curl: ${error.message}`);
    await putJsonWithCurl(url, body);
  }
}

async function main() {
  const dbUrl = normalizeDbUrl(readEnvValue('VITE_FIREBASE_RTDB_URL'));
  const secret = readEnvValue('VITE_GODSEYE_CACHE_SECRET');
  if (!dbUrl || !secret) {
    console.log(`${DEBUG_PREFIX} Missing RTDB cache config, skipping publish`);
    return;
  }

  const rootDir = process.cwd();
  const payload = await buildPayload(rootDir);
  const envelope = await encryptDataObject(payload, secret);
  const hash = await computeCustomHash(payload, secret);
  const body = {
    data: envelope,
    hash,
    timestamp: Date.now(),
    schemaVersion: CACHE_SCHEMA_VERSION,
  };

  log('Publishing encrypted shared runtime cache to RTDB', {
    dbUrl,
    datasets: {
      intelWireItems: Array.isArray(payload.intelWire?.items) ? payload.intelWire.items.length : 0,
      cctvFeeds: Array.isArray(payload.cctvManifest?.feeds) ? payload.cctvManifest.feeds.length : 0,
      satelliteRecords: Array.isArray(payload.satelliteManifest?.records) ? payload.satelliteManifest.records.length : 0,
    },
  });

  await publishWithBestEffort(`${dbUrl}/${CACHE_PATH}`, body);

  log('Shared runtime cache published');
}

main().catch((error) => {
  console.error(`${DEBUG_PREFIX} Failed`, error);
  process.exit(1);
});
