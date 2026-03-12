import NodeCache from 'node-cache';

// Cache configuration
// stdTTL: standard time to live in seconds
// checkperiod: period in seconds for automatic delete check
// useClones: if true, variables will be cloned before setting/getting
export const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false, // Better performance, but be careful with object mutations
});

// Cache middleware factory
export function cacheMiddleware(duration = 300, keyGenerator = null) {
  return (req, res, next) => {
    // Skip cache for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = keyGenerator 
      ? keyGenerator(req) 
      : `${req.originalUrl || req.url}`;

    const cachedResponse = cache.get(key);
    
    if (cachedResponse) {
      req.log?.info('cache_hit', { key });
      return res.json(cachedResponse);
    }

    // Store original res.json
    const originalJson = res.json.bind(res);
    
    // Override res.json to cache the response
    res.json = function(body) {
      cache.set(key, body, duration);
      req.log?.info('cache_miss_stored', { key, duration });
      return originalJson(body);
    };

    next();
  };
}

// Cache utilities
export const cacheUtils = {
  // Invalidate specific cache key
  invalidate(key) {
    return cache.del(key);
  },

  // Invalidate cache keys matching pattern
  invalidatePattern(pattern) {
    const keys = cache.keys();
    const matching = keys.filter(key => key.includes(pattern));
    return cache.del(matching);
  },

  // Clear all cache
  flush() {
    cache.flushAll();
  },

  // Get cache statistics
  getStats() {
    return cache.getStats();
  },

  // Set with custom TTL
  set(key, value, ttl) {
    return cache.set(key, value, ttl);
  },

  // Get cached value
  get(key) {
    return cache.get(key);
  }
};
