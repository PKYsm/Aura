'use strict';

/**
 * Layer 1 — in-memory RAM cache using a native Map.
 * Fastest layer, instant access, cleared on process restart.
 */
class MemoryCache {
  constructor(ttlMs) {
    this.store = new Map();
    this.ttlMs = ttlMs;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value) {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    return value;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

module.exports = MemoryCache;
