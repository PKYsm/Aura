'use strict';
const Redis = require('ioredis');
const config = require('../../config');
const logger = require('../../logger');

/**
 * Layer 2 — Redis via Upstash. Fast, distributed, temporary cache.
 * Sits between the instant in-memory layer and the permanent JSON store.
 */
class RedisCache {
  constructor() {
    this.ttl = config.database.l2TtlSeconds;
    this.client = null;
    this.enabled = Boolean(config.database.redisUrl);

    if (this.enabled) {
      this.client = new Redis(config.database.redisUrl, {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
      });
      this.client.on('error', (err) => logger.database.error('L2 (Redis)', 'connection', err));
      this.client.connect().catch((err) => logger.database.error('L2 (Redis)', 'connect', err));
    }
  }

  async get(key) {
    if (!this.enabled) return undefined;
    const raw = await this.client.get(key);
    return raw ? JSON.parse(raw) : undefined;
  }

  async set(key, value) {
    if (!this.enabled) return;
    await this.client.set(key, JSON.stringify(value), 'EX', this.ttl);
  }

  async delete(key) {
    if (!this.enabled) return;
    await this.client.del(key);
  }
}

module.exports = RedisCache;
