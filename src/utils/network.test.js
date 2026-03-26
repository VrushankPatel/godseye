import { afterEach, describe, expect, test, vi } from 'vitest';
import { clearNetworkCircuitState, fetchJsonWithPolicy, fetchWithPolicy } from './network';

afterEach(() => {
  clearNetworkCircuitState();
  vi.restoreAllMocks();
});

describe('fetchWithPolicy', () => {
  test('retries once before succeeding', async () => {
    let attempts = 0;
    const fetchImpl = vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error('temporary upstream failure');
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const payload = await fetchJsonWithPolicy('https://example.com/feed', {
      fetchImpl,
      retries: 1,
      retryDelayMs: 1,
      circuitKey: 'test:retry',
    });

    expect(payload).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test('opens the circuit after repeated failures', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('upstream failure');
    });

    await expect(fetchWithPolicy('https://example.com/feed', {
      fetchImpl,
      retries: 0,
      circuitFailureThreshold: 2,
      circuitCooldownMs: 60_000,
      circuitKey: 'test:circuit',
    })).rejects.toMatchObject({ code: 'network_error' });

    await expect(fetchWithPolicy('https://example.com/feed', {
      fetchImpl,
      retries: 0,
      circuitFailureThreshold: 2,
      circuitCooldownMs: 60_000,
      circuitKey: 'test:circuit',
    })).rejects.toMatchObject({ code: 'network_error' });

    await expect(fetchWithPolicy('https://example.com/feed', {
      fetchImpl,
      retries: 0,
      circuitFailureThreshold: 2,
      circuitCooldownMs: 60_000,
      circuitKey: 'test:circuit',
    })).rejects.toMatchObject({ code: 'circuit_open' });
  });

  test('returns a timeout error when upstream hangs', async () => {
    const fetchImpl = vi.fn((_url, options = {}) => new Promise((_, reject) => {
      options.signal?.addEventListener('abort', () => {
        reject(options.signal.reason || new DOMException('Request timed out', 'AbortError'));
      }, { once: true });
    }));

    await expect(fetchWithPolicy('https://example.com/hang', {
      fetchImpl,
      retries: 0,
      timeoutMs: 10,
      circuitKey: 'test:timeout',
    })).rejects.toMatchObject({ code: 'timeout' });
  });
});
