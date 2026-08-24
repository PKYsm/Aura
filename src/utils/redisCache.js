"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedis = getRedis;
exports.makeCachedModel = makeCachedModel;

const { Redis } = require("@upstash/redis");

// ─── Singleton Redis client ───────────────────────────────────────────────────
let _redis = null;

/**
 * Returns a singleton Upstash Redis client, or null if env vars are missing.
 * Safe to call multiple times — client is created only once.
 */
function getRedis() {
    if (_redis) return _redis;
    const url = process.env.UPSTASH_REDIS_URL;
    const token = process.env.UPSTASH_REDIS_TOKEN;
    if (!url || !token) {
        console.warn('[Redis] UPSTASH_REDIS_URL / UPSTASH_REDIS_TOKEN not set — Redis cache disabled, running on JSON DB only.');
        return null;
    }
    _redis = new Redis({ url, token });
    return _redis;
}

// Sentinel stored in RAM cache to mean "we looked this up and it was null"
// (so we don't hit Redis again for missing rows)
const NULL_SENTINEL = '\x00__null__';

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function rGet(redis, key) {
    try {
        const raw = await redis.get(key);
        if (raw === null || raw === undefined) return undefined; // cache miss
        if (raw === NULL_SENTINEL) return null;                  // cached null
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
        return undefined; // Redis down → treat as miss
    }
}

async function rSet(redis, key, val, ttl) {
    try {
        const toStore = (val === null || val === undefined) ? NULL_SENTINEL : JSON.stringify(val);
        await redis.set(key, toStore, { ex: ttl });
    } catch (e) { /* non-fatal — Redis is cache, not source of truth */ }
}

async function rDel(redis, key) {
    if (!key) return;
    try { await redis.del(key); } catch (e) {}
}

// ─── Core factory ─────────────────────────────────────────────────────────────
/**
 * Wraps a JsonDatabase Model with L1 (RAM) + L2 (Redis) caching.
 *
 *   findUnique  →  RAM → Redis → JsonDB    (fully cached, 3-tier)
 *   writes      →  write-through: JsonDB first, then update both caches
 *   findFirst / findMany / count  →  pass-through (not cached)
 *
 * @param {object} model      - Model instance from JsonDatabase
 * @param {object} redis      - Upstash Redis client (from getRedis())
 * @param {object} ramCache   - Dedicated NodeCache for DB caching
 * @param {function} keyFn    - (where|record) => string|null  — derives cache key
 * @param {number} redisTTL   - Redis TTL in seconds
 */
function makeCachedModel(model, redis, ramCache, keyFn, redisTTL) {
    // RAM TTL is always shorter (max 5 min) — RAM is fastest but bounded in size.
    // Upstash Redis holds the longer-lived copy.
    const ramTTL = Math.min(redisTTL, 300);

    return {
        // ── READ (3-tier) ────────────────────────────────────────────────────
        async findUnique(args = { where: {} }) {
            const key = keyFn(args.where);
            if (key) {
                // L1: RAM cache (~0 ms)
                const ramHit = ramCache.get(key);
                if (ramHit !== undefined) {
                    return ramHit === NULL_SENTINEL ? null : ramHit;
                }
                // L2: Redis (~15–30 ms)
                const redisHit = await rGet(redis, key);
                if (redisHit !== undefined) {
                    ramCache.set(key, redisHit === null ? NULL_SENTINEL : redisHit, ramTTL);
                    return redisHit;
                }
            }
            // L3: JSON file DB (~0–5 ms local disk)
            const result = await model.findUnique(args);
            if (key) {
                // Populate both caches so next call is served from RAM
                await rSet(redis, key, result, redisTTL);
                ramCache.set(key, result === null ? NULL_SENTINEL : result, ramTTL);
            }
            return result;
        },

        // Pass-throughs (not worth caching — query shapes vary too much)
        async findFirst(args = {})  { return model.findFirst(args); },
        async findMany(args = {})   { return model.findMany(args); },
        async count(args = {})      { return model.count(args); },

        // ── WRITES (write-through: DB first, then update caches) ─────────────
        async create(args) {
            const result = await model.create(args);
            // keyFn works on result objects too — they have all fields
            const key = keyFn(result);
            if (key) {
                await rSet(redis, key, result, redisTTL);
                ramCache.set(key, result, ramTTL);
            }
            return result;
        },
        async upsert(args) {
            const result = await model.upsert(args);
            const key = keyFn(args.where);
            if (key) {
                await rSet(redis, key, result, redisTTL);
                ramCache.set(key, result, ramTTL);
            }
            return result;
        },
        async update(args) {
            const result = await model.update(args);
            const key = keyFn(args.where);
            if (key) {
                await rSet(redis, key, result, redisTTL);
                ramCache.set(key, result, ramTTL);
            }
            return result;
        },
        async delete(args) {
            const result = await model.delete(args);
            const key = keyFn(args.where);
            if (key) {
                await rDel(redis, key);
                ramCache.del(key);
            }
            return result;
        },
        async deleteMany(args = {}) {
            // deleteMany is rare and has no clean single-key invalidation —
            // individual entries will expire from Redis naturally via their TTL.
            return model.deleteMany(args);
        },
    };
}
