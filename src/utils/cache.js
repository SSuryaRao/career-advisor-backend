// Simple in-memory cache with TTL
class Cache {
  constructor() {
    this.store = new Map();
  }

  /**
   * Set a value in cache with TTL (time to live)
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
   */
  set(key, value, ttl = 300000) {
    const expiresAt = Date.now() + ttl;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or null if not found or expired
   */
  get(key) {
    const item = this.store.get(key);

    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Delete a specific key from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.store.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.store.clear();
  }

  /**
   * Delete all expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (now > item.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let expired = 0;
    const now = Date.now();

    for (const item of this.store.values()) {
      if (now > item.expiresAt) {
        expired++;
      }
    }

    return {
      total: this.store.size,
      active: this.store.size - expired,
      expired
    };
  }
}

// Create singleton instance
const cache = new Cache();

// Run cleanup every 10 minutes
setInterval(() => {
  cache.cleanup();
  console.log('🧹 Cache cleanup completed:', cache.getStats());
}, 600000);

module.exports = cache;
