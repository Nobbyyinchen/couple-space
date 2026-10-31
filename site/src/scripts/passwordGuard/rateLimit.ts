export interface RateState {
  failures: number;
  lockedUntil: number;
  lastFailureAt: number;
}

export function parseNumberInRange(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
}

export function createDefaultRateState(): RateState {
  return {
    failures: 0,
    lockedUntil: 0,
    lastFailureAt: 0,
  };
}

export function sanitizeRateState(value: unknown): RateState {
  if (!value || typeof value !== 'object') return createDefaultRateState();
  const source = value as Partial<RateState>;
  const failures = Number.isFinite(source.failures) ? Math.max(0, source.failures || 0) : 0;
  const lockedUntil = Number.isFinite(source.lockedUntil) ? Math.max(0, source.lockedUntil || 0) : 0;
  const lastFailureAt = Number.isFinite(source.lastFailureAt) ? Math.max(0, source.lastFailureAt || 0) : 0;
  return { failures, lockedUntil, lastFailureAt };
}

export function normalizeRateState(state: RateState, failureResetMs: number, now = Date.now()): RateState {
  if (state.lastFailureAt > 0 && now - state.lastFailureAt > failureResetMs) {
    return createDefaultRateState();
  }
  return state;
}

export function computeLockMs(
  failures: number,
  options: {
    rateLimitEnabled: boolean;
    freeAttempts: number;
    baseLockMs: number;
    maxLockMs: number;
  },
): number {
  if (!options.rateLimitEnabled) return 0;
  const overLimit = failures - options.freeAttempts;
  if (overLimit <= 0) return 0;
  const exponent = Math.min(overLimit - 1, 8);
  return Math.min(options.baseLockMs * Math.pow(2, exponent), options.maxLockMs);
}
