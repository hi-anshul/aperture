export interface FetchEngineConfig {
  timeoutMs: number;
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  backoffMultiplier: number;
  rateLimitIntervalMs: number;
  defaultUserAgent: string;
}

export const DEFAULT_USER_AGENT =
  "Aperture/1.0 (personal job-search tool; honest bot)";

export const DEFAULT_FETCH_CONFIG: FetchEngineConfig = {
  timeoutMs: 30_000,
  maxRetries: 3,
  initialBackoffMs: 1_000,
  maxBackoffMs: 30_000,
  backoffMultiplier: 2,
  rateLimitIntervalMs: 2_000,
  defaultUserAgent: DEFAULT_USER_AGENT,
};

export function getFetchEngineConfig(
  overrides: Partial<FetchEngineConfig> = {},
): FetchEngineConfig {
  return {
    timeoutMs: parsePositiveInt(
      process.env.FETCH_TIMEOUT_MS,
      DEFAULT_FETCH_CONFIG.timeoutMs,
    ),
    maxRetries: parsePositiveInt(
      process.env.FETCH_MAX_RETRIES,
      DEFAULT_FETCH_CONFIG.maxRetries,
    ),
    initialBackoffMs: parsePositiveInt(
      process.env.FETCH_INITIAL_BACKOFF_MS,
      DEFAULT_FETCH_CONFIG.initialBackoffMs,
    ),
    maxBackoffMs: parsePositiveInt(
      process.env.FETCH_MAX_BACKOFF_MS,
      DEFAULT_FETCH_CONFIG.maxBackoffMs,
    ),
    backoffMultiplier: parsePositiveFloat(
      process.env.FETCH_BACKOFF_MULTIPLIER,
      DEFAULT_FETCH_CONFIG.backoffMultiplier,
    ),
    rateLimitIntervalMs: parsePositiveInt(
      process.env.FETCH_RATE_LIMIT_MS,
      DEFAULT_FETCH_CONFIG.rateLimitIntervalMs,
    ),
    defaultUserAgent:
      process.env.FETCH_USER_AGENT ?? DEFAULT_FETCH_CONFIG.defaultUserAgent,
    ...overrides,
  };
}

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePositiveFloat(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
