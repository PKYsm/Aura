'use strict';
const MemoryCache = require('./layers/l1Memory');
const RedisCache = require('./layers/l2Redis');
const JsonStore = require('./layers/l3Json');
const config = require('../config');
const logger = require('../logger');

/**
 * AuraDB — the unified 3-layer cache/database facade.
 *
 * Read path:  L1 (Map) -> L2 (Redis) -> L3 (db.json)
 * Every hit below L1 backfills the layers above it.
 *
 * Write path: writes go to all three layers. L3 is always the
 * durable source of truth; L1/L2 are best-effort acceleration.
 */
class AuraDB {
  constructor() {
    this.l1 = new MemoryCache(config.database.l1TtlMs);
    this.l2 = new RedisCache();
    this.l3 = new JsonStore();
  }

  async get(key) {
    const l1Hit = this.l1.get(key);
    if (l1Hit !== undefined) {
      logger.database.layerHit('L1', key);
      return l1Hit;
    }
    logger.database.layerMiss('L1', key);

    try {
      const l2Hit = await this.l2.get(key);
      if (l2Hit !== undefined) {
        logger.database.layerHit('L2', key);
        this.l1.set(key, l2Hit);
        return l2Hit;
      }
      logger.database.layerMiss('L2', key);
    } catch (err) {
      logger.database.error('L2', key, err);
    }

    const l3Hit = this.l3.get(key);
    if (l3Hit !== undefined) {
      logger.database.layerHit('L3', key);
      this.l1.set(key, l3Hit);
      try {
        await this.l2.set(key, l3Hit);
      } catch (err) {
        logger.database.error('L2 (backfill)', key, err);
      }
      return l3Hit;
    }
    logger.database.layerMiss('L3', key);

    return undefined;
  }

  async set(key, value) {
    this.l1.set(key, value);
    try {
      await this.l2.set(key, value);
    } catch (err) {
      logger.database.error('L2 (write)', key, err);
    }
    this.l3.set(key, value); // durable write, always happens
    return value;
  }

  async delete(key) {
    this.l1.delete(key);
    try {
      await this.l2.delete(key);
    } catch (err) {
      logger.database.error('L2 (delete)', key, err);
    }
    this.l3.delete(key);
  }
}

module.exports = new AuraDB();
