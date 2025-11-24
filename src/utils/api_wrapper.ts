/**
 * API Wrapper for CRM V9
 * Implements exponential backoff and caching strategies
 */

type ApiCall<T> = () => T;

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffFactor: 2,
};

/**
 * Executes an API call with exponential backoff for 429 errors.
 */
export function executeWithBackoff<T>(
  apiCall: ApiCall<T>,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS
): T {
  const maxRetries = options.maxRetries ?? 3;
  let delay = options.initialDelayMs ?? 1000;
  const backoffFactor = options.backoffFactor ?? 2;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return apiCall();
    } catch (e: unknown) {
      // Check if error is retryable (e.g., rate limit exceeded)
      // Google Apps Script doesn't always provide standard HTTP status codes in exceptions,
      // so we might need to inspect the error message.
      const errorMessage = e instanceof Error ? e.message : String(e);
      const isRateLimit = errorMessage.includes('429') ||
                          errorMessage.includes('Rate limit') ||
                          errorMessage.includes('Too many requests') ||
                          errorMessage.includes('Service invoked too many times');

      if (attempt <= maxRetries && isRateLimit) {
        console.warn(`API call failed (Attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`, e);
        Utilities.sleep(delay);
        delay *= backoffFactor;
      } else {
        console.error(`API call failed permanently after ${attempt} attempts.`, e);
        throw e;
      }
    }
  }

  throw new Error('Unreachable code');
}

/**
 * Interface for Cache Service wrapper to support testing and swapping
 */
export interface CacheProvider {
  get(key: string): string | null;
  put(key: string, value: string, expirationInSeconds: number): void;
  remove(key: string): void;
}

/**
 * Default implementation using Google Apps Script CacheService
 */
export const GASCache: CacheProvider = {
  get: (key: string) => CacheService.getScriptCache().get(key),
  put: (key: string, value: string, expirationInSeconds: number) => 
    CacheService.getScriptCache().put(key, value, expirationInSeconds),
  remove: (key: string) => CacheService.getScriptCache().remove(key),
};

/**
 * Executes an API call with caching.
 * Note: This uses GAS CacheService for short-term caching.
 * For persistent AI responses, use Firestore (implemented elsewhere).
 */
export function executeWithCache<T>(
  key: string,
  apiCall: ApiCall<T>,
  expirationInSeconds: number = 21600, // 6 hours default
  cacheProvider: CacheProvider = GASCache
): T {
  const cached = cacheProvider.get(key);
  if (cached) {
    console.log(`Cache hit for key: ${key}`);
    return JSON.parse(cached) as T;
  }

  console.log(`Cache miss for key: ${key}. Executing API call...`);
  const result = executeWithBackoff(apiCall);
  
  try {
    cacheProvider.put(key, JSON.stringify(result), expirationInSeconds);
  } catch (e) {
    console.warn('Failed to write to cache (value might be too large).', e);
  }
  
  return result;
}