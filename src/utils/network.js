const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_RETRIES = 1;
const DEFAULT_RETRY_DELAY_MS = 450;
const DEFAULT_BACKOFF_FACTOR = 1.8;
const DEFAULT_CIRCUIT_FAILURE_THRESHOLD = 3;
const DEFAULT_CIRCUIT_COOLDOWN_MS = 60_000;

const circuitState = new Map();

export class NetworkPolicyError extends Error {
    constructor(message, code = 'network_error', meta = {}) {
        super(message);
        this.name = 'NetworkPolicyError';
        this.code = code;
        this.meta = meta;
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCircuitEntry(circuitKey) {
    if (!circuitKey) return null;
    if (!circuitState.has(circuitKey)) {
        circuitState.set(circuitKey, {
            failureCount: 0,
            lastFailureAt: 0,
        });
    }
    return circuitState.get(circuitKey);
}

function isCircuitOpen(circuitKey, failureThreshold, cooldownMs) {
    const entry = getCircuitEntry(circuitKey);
    if (!entry) return false;
    if (entry.failureCount < failureThreshold) return false;
    if (!entry.lastFailureAt) return false;
    return Date.now() - entry.lastFailureAt < cooldownMs;
}

function recordCircuitFailure(circuitKey) {
    const entry = getCircuitEntry(circuitKey);
    if (!entry) return;
    entry.failureCount += 1;
    entry.lastFailureAt = Date.now();
}

function recordCircuitSuccess(circuitKey) {
    const entry = getCircuitEntry(circuitKey);
    if (!entry) return;
    entry.failureCount = 0;
    entry.lastFailureAt = 0;
}

function bindAbortSignal(sourceSignal, controller) {
    if (!sourceSignal) return () => {};
    if (sourceSignal.aborted) {
        controller.abort(sourceSignal.reason);
        return () => {};
    }

    const forwardAbort = () => controller.abort(sourceSignal.reason);
    sourceSignal.addEventListener('abort', forwardAbort, { once: true });
    return () => sourceSignal.removeEventListener('abort', forwardAbort);
}

function isRetriableStatus(status) {
    return status === 408 || status === 425 || status === 429 || status >= 500;
}

function normalizeError(error) {
    if (error instanceof NetworkPolicyError) return error;

    if (error?.name === 'AbortError') {
        return new NetworkPolicyError('Request aborted', 'aborted');
    }

    return new NetworkPolicyError(error?.message || 'Network request failed', 'network_error');
}

function defaultShouldRetry(error) {
    if (!error) return false;
    if (error.code === 'aborted' || error.code === 'circuit_open') return false;
    if (error.code === 'timeout' || error.code === 'network_error') return true;
    if (error.code === 'http_error') {
        return isRetriableStatus(Number(error.meta?.status));
    }
    return false;
}

export function clearNetworkCircuitState(circuitKey = null) {
    if (!circuitKey) {
        circuitState.clear();
        return;
    }
    circuitState.delete(circuitKey);
}

export async function fetchWithPolicy(url, options = {}) {
    const {
        signal,
        timeoutMs = DEFAULT_TIMEOUT_MS,
        retries = DEFAULT_RETRIES,
        retryDelayMs = DEFAULT_RETRY_DELAY_MS,
        backoffFactor = DEFAULT_BACKOFF_FACTOR,
        circuitKey = String(url || ''),
        circuitFailureThreshold = DEFAULT_CIRCUIT_FAILURE_THRESHOLD,
        circuitCooldownMs = DEFAULT_CIRCUIT_COOLDOWN_MS,
        shouldRetry = defaultShouldRetry,
        fetchImpl = fetch,
        ...fetchOptions
    } = options;

    if (
        circuitKey &&
        isCircuitOpen(circuitKey, circuitFailureThreshold, circuitCooldownMs)
    ) {
        throw new NetworkPolicyError(
            `Circuit open for ${circuitKey}`,
            'circuit_open',
            { circuitKey }
        );
    }

    let attempt = 0;
    let delayMs = retryDelayMs;

    while (attempt <= retries) {
        const controller = new AbortController();
        const detachAbort = bindAbortSignal(signal, controller);
        const timeoutId = setTimeout(() => {
            controller.abort(new DOMException('Request timed out', 'AbortError'));
        }, timeoutMs);

        try {
            const response = await fetchImpl(url, {
                cache: 'no-store',
                ...fetchOptions,
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new NetworkPolicyError(
                    `HTTP ${response.status}`,
                    'http_error',
                    { status: response.status, url }
                );
            }

            recordCircuitSuccess(circuitKey);
            return response;
        } catch (error) {
            const normalized = normalizeError(error);
            if (normalized.code !== 'aborted') {
                recordCircuitFailure(circuitKey);
            }

            const timedOut = normalized.code === 'aborted' && !signal?.aborted;
            const enrichedError = timedOut
                ? new NetworkPolicyError(
                    `Request timed out after ${timeoutMs}ms`,
                    'timeout',
                    { url, timeoutMs }
                )
                : normalized;

            if (attempt >= retries || !shouldRetry(enrichedError, attempt)) {
                throw enrichedError;
            }

            await sleep(delayMs);
            delayMs = Math.round(delayMs * backoffFactor);
            attempt += 1;
        } finally {
            clearTimeout(timeoutId);
            detachAbort();
        }
    }

    throw new NetworkPolicyError('Network request exhausted retries', 'retry_exhausted', { url });
}

export async function fetchJsonWithPolicy(url, options = {}) {
    const response = await fetchWithPolicy(url, options);
    return response.json();
}

export async function fetchTextWithPolicy(url, options = {}) {
    const response = await fetchWithPolicy(url, options);
    return response.text();
}
