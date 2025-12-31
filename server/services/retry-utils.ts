/**
 * Retry utility for handling transient failures
 */

import { BulkTaggingError, ErrorCode } from './error-types';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: ErrorCode[];
  onRetry?: (attempt: number, error: Error, nextDelay: number) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    ErrorCode.DATABASE_CONNECTION_ERROR,
    ErrorCode.DATABASE_QUERY_ERROR,
    ErrorCode.DATABASE_TRANSACTION_ERROR,
    ErrorCode.OPERATION_TIMEOUT,
    ErrorCode.DUPLICATE_DETECTION_FAILED,
  ],
};

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate the next delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number
): number {
  const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
  // Add some jitter to avoid thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return Math.min(delay + jitter, maxDelay);
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: Error, retryableErrors: ErrorCode[]): boolean {
  if (error instanceof BulkTaggingError) {
    return error.recoverable || retryableErrors.includes(error.code);
  }
  // Retry on network-related errors
  if (error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ECONNRESET')) {
    return true;
  }
  return false;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;
  
  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      if (!isRetryableError(lastError, opts.retryableErrors)) {
        throw lastError;
      }
      
      // Don't retry if this was the last attempt
      if (attempt === opts.maxRetries) {
        throw lastError;
      }
      
      // Calculate next delay
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      );
      
      // Call retry callback if provided
      if (opts.onRetry) {
        opts.onRetry(attempt, lastError, delay);
      }
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  // Should never reach here, but TypeScript needs this
  throw lastError!;
}

/**
 * Retry decorator for class methods
 */
export function Retryable(options: RetryOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      return retryWithBackoff(
        () => originalMethod.apply(this, args),
        options
      );
    };
    
    return descriptor;
  };
}

/**
 * Circuit breaker for preventing cascade failures
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly resetTimeout: number = 30000 // 30 seconds
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should be reset
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        this.failureCount = 0;
      } else {
        throw new BulkTaggingError(
          ErrorCode.OPERATION_TIMEOUT,
          'Circuit breaker is open - too many failures',
          {
            failureCount: this.failureCount,
            timeUntilReset: this.timeout - (now - this.lastFailureTime),
          },
          [
            { action: 'wait', description: `Wait ${Math.ceil((this.timeout - (now - this.lastFailureTime)) / 1000)} seconds before retrying` },
            { action: 'contact_support', description: 'Contact support if the issue persists' },
          ],
          false
        );
      }
    }
    
    try {
      const result = await fn();
      
      // Success - reset failure count
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
      }
      this.failureCount = 0;
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.threshold) {
        this.state = 'OPEN';
      }
      
      throw error;
    }
  }
  
  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
  }
  
  getState(): { state: string; failureCount: number; lastFailureTime: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Singleton circuit breaker instances for different operations
export const bulkTagCircuitBreaker = new CircuitBreaker();
export const duplicateDetectionCircuitBreaker = new CircuitBreaker();

/**
 * Batch retry utility for processing large sets with partial failure handling
 */
export async function retryBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    maxRetries?: number;
    onItemError?: (item: T, error: Error, attempt: number) => void;
    onItemSuccess?: (item: T, result: R) => void;
  } = {}
): Promise<{ successful: Array<{ item: T; result: R }>; failed: Array<{ item: T; error: Error }> }> {
  const {
    batchSize = 10,
    maxRetries = 3,
    onItemError,
    onItemSuccess,
  } = options;
  
  const successful: Array<{ item: T; result: R }> = [];
  const failed: Array<{ item: T; error: Error }> = [];
  
  // Process items in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, Math.min(i + batchSize, items.length));
    
    // Process each item in the batch with retry
    await Promise.all(
      batch.map(async (item) => {
        try {
          const result = await retryWithBackoff(
            () => processor(item),
            { maxRetries }
          );
          successful.push({ item, result });
          onItemSuccess?.(item, result);
        } catch (error) {
          failed.push({ item, error: error as Error });
          onItemError?.(item, error as Error, maxRetries);
        }
      })
    );
  }
  
  return { successful, failed };
}