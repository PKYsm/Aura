"use strict";

const { Redis } = require("@upstash/redis");

// ─── NULL Sentinel ────────────────────────────────────────────────────────────
// Stored in both L1 (RAM) and L2 (Redis) when a DB lookup returns null.
// Prevents "cache stampede": without this, every request for a missing guild
// would fall through to the JSON DB on every single call.
const NULL_SENTINEL = '\x00__null__';

// ─── Singleton Redis Client ───────────────────────────────────────────────────
let _redis = null;

/**
 * Returns a singleton Upstash Redis client, or null if env vars are missing.
 * Safe to call multiple times — the client is created exactly once.
 */
function getRedis() {
    if (_redis) return _redis;
    const url   = process.env.UPSTASH_REDIS_URL;
    const token = process.env.UPSTASH_REDIS_TOKEN;
    if (!url || !token) {
        console.warn('[Redis] UPSTASH_REDIS_URL / UPSTASH_REDIS_TOKEN not set — Redis disabled. Running on JSON DB only.');
        return null;
    }
    _redis = new Redis({ url, token });
    console.log('[Redis] ✅ Singleton client created.');
    return _redis;
}

// ─── Circuit Breaker ──────────────────────────────────────────────────────────
// If Redis fails MAX_FAILURES times in a row, the circuit "opens" and all Redis
// calls are skipped for RESET_MS milliseconds. This prevents a flaky/down Redis
// from adding latency to every single command during an outage.
// After RESET_MS, the circuit moves to "half-open": the next call goes through.
// On success → circuit closes (full operation resumes).
// On failure → circuit stays open, timer resets.

const MAX_FAILURES = 5;
const RESET_MS     = 60_000; // 1 minute cooldown after tripping

let _failures      = 0;
let _openUntil     = 0;
let _circuitState  = 'closed'; // 'closed' | 'open' | 'half-open'

function isCircuitOpen() {
    if (_circuitState === 'closed') return false;
    if (_circuitState === 'open') {
        if (Date.now() >= _openUntil) {
            _circuitState = 'half-open';
            console.warn('[Redis] Circuit half-open — probing Redis...');
            return false; // allow one probe through
        }
        return true; // still open, skip Redis
    }
    return false; // half-open: let the call through
}

function recordSuccess() {
    if (_circuitState !== 'closed') {
        console.log('[Redis] ✅ Circuit closed — Redis is healthy again.');
    }
    _failures     = 0;
    _openUntil    = 0;
    _circuitState = 'closed';
}

function recordFailure(key, err) {
    _failures++;
    if (_failures >= MAX_FAILURES && _circuitState !== 'open') {
        _openUntil    = Date.now() + RESET_MS;
        _circuitState = 'open';
        console.error(`[Redis] ⚡ Circuit OPEN after ${MAX_FAILURES} failures — Redis skipped for ${RESET_MS / 1000}s.`, err?.message ?? '');
    }
}

// ─── Low-level Helpers ────────────────────────────────────────────────────────

/**
 * GET from Redis.
 * Returns:
 *   undefined  → cache miss (key doesn't exist or Redis is down/circuit-open)
 *   null       → cached null (NULL_SENTINEL was stored for this key)
 *   object     → parsed cached value
 */
async function rGet(redis, key) {
    if (isCircuitOpen()) return undefined;
    try {
        const raw = await redis.get(key);
        recordSuccess();
        if (raw === null || raw === undefined) return undefined;  // miss
        if (raw === NULL_SENTINEL)             return null;        // cached null
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
        recordFailure(key, e);
        return undefined; // treat as miss — fall through to JSON DB
    }
}

/**
 * SET in Redis with TTL.
 * Stores NULL_SENTINEL when val is null/undefined so future reads
 * don't re-query the JSON DB for a known-missing record.
 */
async function rSet(redis, key, val, ttl) {
    if (isCircuitOpen()) return;
    try {
        const toStore = (val === null || val === undefined) ? NULL_SENTINEL : JSON.stringify(val);
        await redis.set(key, toStore, { ex: ttl });
        recordSuccess();
    } catch (e) {
        recordFailure(key, e);
        // Non-fatal: Redis is a cache, not the source of truth
    }
}

/**
 * DEL a key from Redis.
 * Called on write/delete to invalidate stale cached data.
 */
async function rDel(redis, key) {
    if (!key || isCircuitOpen()) return;
    try {
        await redis.del(key);
        recordSuccess();
    } catch (e) {
        recordFailure(key, e);
    }
}

// ─── makeCachedModel ──────────────────────────────────────────────────────────

/**
 * Wraps a JsonDatabase Model with L1 (RAM) + L2 (Redis) caching.
 *
 * Read path  (L1 → L2 → L3):
 *   1. RAM cache hit?   → return immediately (~0 ms)
 *   2. Redis hit?       → populate RAM, return (~15-30 ms)
 *   3. JSON DB hit?     → populate Redis + RAM, return (~0-5 ms)
 *
 * Write path (Write-Through — L3 first, then L2 and L1):
 *   Write to JSON DB → update Redis → update RAM
 *   Source of truth is always the JSON DB. Caches are always consistent.
 *
 * NULL Caching:
 *   A DB miss (null) is stored as NULL_SENTINEL in both caches.
 *   The next read returns null instantly without touching the DB.
 *
 * @param {object}   model     - Model instance from JsonDatabase
 * @param {object}   redis     - Upstash Redis client (from getRedis())
 * @param {object}   ramCache  - NodeCache instance (dedicated DB RAM cache)
 * @param {function} keyFn     - (where|record) => string|null — derives cache key
 * @param {number}   redisTTL  - Redis TTL in seconds
 */
function makeCachedModel(model, redis, ramCache, keyFn, redisTTL) {
    // RAM TTL is always ≤ 5 min — fast but bounded in memory.
    // Redis holds the longer-lived copy across restarts.
    const ramTTL = Math.min(redisTTL, 300);

    return {
        // ── READ: L1 → L2 → L3 ───────────────────────────────────────────────
        async findUnique(args = { where: {} }) {
            const key = keyFn(args.where);

            if (key) {
                // L1: RAM (~0 ms) ─────────────────────────────────────────────
                const ramHit = ramCache.get(key);
                if (ramHit !== undefined) {
                    return ramHit === NULL_SENTINEL ? null : ramHit;
                }

                // L2: Redis (~15-30 ms) ───────────────────────────────────────
                const redisHit = await rGet(redis, key);
                if (redisHit !== undefined) {
                    // Backfill L1
                    ramCache.set(key, redisHit === null ? NULL_SENTINEL : redisHit, ramTTL);
                    return redisHit;
                }
            }

            // L3: JSON DB (~0-5 ms local disk) ────────────────────────────────
            const result = await model.findUnique(args);

            if (key) {
                // Populate both caches (including null → NULL_SENTINEL)
                await rSet(redis, key, result, redisTTL);
                ramCache.set(key, result === null ? NULL_SENTINEL : result, ramTTL);
            }

            return result;
        },

        // Pass-throughs — query shapes vary too much to cache safely
        async findFirst(args = {})  { return model.findFirst(args); },
        async findMany(args = {})   { return model.findMany(args); },
        async count(args = {})      { return model.count(args); },

        // ── WRITES: Write-Through (L3 first → then L2 + L1) ─────────────────
        async create(args) {
            // L3 first — source of truth
            const result = await model.create(args);
            const key    = keyFn(result);
            if (key) {
                await rSet(redis, key, result, redisTTL); // L2
                ramCache.set(key, result, ramTTL);        // L1
            }
            return result;
        },

        async upsert(args) {
            const result = await model.upsert(args);
            const key    = keyFn(args.where);
            if (key) {
                await rSet(redis, key, result, redisTTL);
                ramCache.set(key, result, ramTTL);
            }
            return result;
        },

        async update(args) {
            const result = await model.update(args);
            const key    = keyFn(args.where);
            if (key) {
                await rSet(redis, key, result, redisTTL);
                ramCache.set(key, result, ramTTL);
            }
            return result;
        },

        async delete(args) {
            const result = await model.delete(args);
            const key    = keyFn(args.where);
            if (key) {
                await rDel(redis, key);  // remove from L2
                ramCache.del(key);       // remove from L1
            }
            return result;
        },

        async deleteMany(args = {}) {
            // No clean single-key invalidation possible — individual entries
            // will expire from Redis naturally via their TTL.
            return model.deleteMany(args);
        },
    };
}

exports.getRedis       = getRedis;
exports.makeCachedModel= makeCachedModel;
