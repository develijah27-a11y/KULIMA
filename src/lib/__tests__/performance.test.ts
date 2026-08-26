/**
 * Performance & Caching Utility Unit Tests
 * Requirements: 20.1, 20.2, 20.3, 20.5
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { debounce, throttle } from '../performance';
import { cache, CacheTTL, cachedFetch } from '../cache';

describe('Performance Utilities', () => {
  beforeEach(() => {
    cache.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('debounce', () => {
    it('should debounce rapid successive function calls', () => {
      const mockFn = jest.fn();
      const debounced = debounce(mockFn, 200);

      debounced();
      debounced();
      debounced();

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(200);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    it('should throttle function calls to interval', () => {
      const mockFn = jest.fn();
      const throttled = throttle(mockFn, 300);

      throttled();
      throttled();
      throttled();

      expect(mockFn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(300);
      throttled();
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('MemoryCache', () => {
    it('should store and retrieve data within TTL', () => {
      cache.set('test-key', { value: 123 }, 5000);

      const retrieved = cache.get<{ value: number }>('test-key');
      expect(retrieved).toEqual({ value: 123 });
    });

    it('should return null when TTL expires', () => {
      cache.set('test-key', { value: 123 }, 1000);

      jest.advanceTimersByTime(1500);

      const retrieved = cache.get('test-key');
      expect(retrieved).toBeNull();
    });

    it('cachedFetch should use cache on subsequent calls without invoking fetcher', async () => {
      const fetcher = jest.fn<() => Promise<{ name: string }>>().mockResolvedValue({ name: 'Maize' });

      const res1 = await cachedFetch('crop-1', fetcher, CacheTTL.MEDIUM);
      expect(res1).toEqual({ name: 'Maize' });
      expect(fetcher).toHaveBeenCalledTimes(1);

      const res2 = await cachedFetch('crop-1', fetcher, CacheTTL.MEDIUM);
      expect(res2).toEqual({ name: 'Maize' });
      expect(fetcher).toHaveBeenCalledTimes(1); // Not called again!
    });
  });
});
