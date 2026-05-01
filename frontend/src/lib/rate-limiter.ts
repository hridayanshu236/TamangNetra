/**
 * Token Bucket Rate Limiter for TMT API
 *
 * 60 tokens per minute, refills at 1 token per second.
 * When no tokens are available, acquire() waits until one becomes available.
 */

const MAX_TOKENS = 60;
const REFILL_RATE = 1; // tokens per second
const REFILL_INTERVAL_MS = 1000 / REFILL_RATE;

interface TokenBucket {
  tokens: number;
  lastRefillTime: number;
}

const bucket: TokenBucket = {
  tokens: MAX_TOKENS,
  lastRefillTime: Date.now(),
};

/** Queue of pending acquire promises */
interface PendingRequest {
  resolve: () => void;
}

const pendingQueue: PendingRequest[] = [];

/**
 * Refill tokens based on elapsed time since last refill.
 */
function refillTokens(): void {
  const now = Date.now();
  const elapsed = now - bucket.lastRefillTime;
  const tokensToAdd = Math.floor(elapsed / REFILL_INTERVAL_MS);

  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + tokensToAdd);
    bucket.lastRefillTime = now;
  }
}

/**
 * Process the pending queue, granting tokens to waiting requests.
 */
function processQueue(): void {
  while (bucket.tokens > 0 && pendingQueue.length > 0) {
    bucket.tokens -= 1;
    const next = pendingQueue.shift();
    if (next) {
      next.resolve();
    }
  }
}

/**
 * Acquire a token from the bucket. If no tokens are available,
 * this waits until one becomes available (respecting the rate limit).
 */
export async function acquire(): Promise<void> {
  refillTokens();

  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    return;
  }

  // No tokens available — wait in the queue
  return new Promise<void>((resolve) => {
    pendingQueue.push({ resolve });

    // Set up a periodic check to process the queue
    const intervalId = setInterval(() => {
      refillTokens();
      processQueue();
      if (pendingQueue.length === 0) {
        clearInterval(intervalId);
      }
    }, REFILL_INTERVAL_MS);
  });
}

/**
 * Get the current number of available tokens (for monitoring/debugging).
 */
export function getAvailableTokens(): number {
  refillTokens();
  return bucket.tokens;
}

/**
 * Get the number of pending requests waiting for tokens.
 */
export function getPendingCount(): number {
  return pendingQueue.length;
}

/**
 * Reset the rate limiter to its initial state.
 */
export function reset(): void {
  bucket.tokens = MAX_TOKENS;
  bucket.lastRefillTime = Date.now();
  pendingQueue.length = 0;
}
