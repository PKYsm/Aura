"use strict";

const fs   = require('fs');
const path = require('path');

/**
 * Zero-setup JSON-file database.
 * Drop-in replacement for the Prisma client used across this codebase —
 * same method names/shapes (findUnique, findFirst, findMany, create, upsert, delete),
 * but backed by a single local JSON file instead of SQLite/Prisma.
 *
 * No `prisma generate`, no `prisma db push`, no native engine binaries.
 * The file is created automatically on first run at ./data/db.json
 *
 * ─── Safe Write Strategy ─────────────────────────────────────────────────────
 * Every save() writes to a .tmp file first, then atomically renames it over the
 * real db.json. This guarantees that a crash or OOM mid-write can never produce
 * a half-written / corrupt database file — the old file stays intact until the
 * new one is fully flushed. On the same filesystem, rename() is O(1) and atomic
 * at the OS level (POSIX rename guarantee).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DB_FILE  = path.join(process.cwd(), 'data', 'db.json');
const TMP_FILE = DB_FILE + '.tmp';

const MODEL_DEFAULTS = {
    guildConfig: {
        prefix:           '$',
        nameplateFontId:  11,
        nameplateEffectId: 1,
        nameplateColors:  '16777215',
        nameplateHex:     '#FFFFFF',
    },
    premiumUser: { tier: 1 },
    userConfig:  { searchEngine: 'spsearch' },
};

const AUTO_ID_MODELS   = new Set(['autoReact','autoRespond','ignoredChannel','likedTrack','playlist','playlistTrack']);
const ADDED_AT_MODELS  = new Set(['noPrefixUser','premiumUser','adminUser','likedTrack','blacklist']);
const CREATED_AT_MODELS= new Set(['guildConfig','playlist']);
const UPDATED_AT_MODELS= new Set(['guildConfig','userConfig']);
const OPERATOR_KEYS    = ['lt','lte','gt','gte','in','not'];

// ─── Utilities ────────────────────────────────────────────────────────────────

function isPlainObject(val) {
    return val !== null && typeof val === 'object' && !(val instanceof Date) && !Array.isArray(val);
}

function matchWhere(record, where) {
    if (!where) return true;
    for (const key of Object.keys(where)) {
        const val = where[key];
        if (isPlainObject(val)) {
            const isOperatorObj = Object.keys(val).some((k) => OPERATOR_KEYS.includes(k));
            if (isOperatorObj) {
                const fieldVal = record[key];
                // null means "no expiry / lifetime" — never matches any date comparison.
                // Without this guard, new Date(null) = Jan 1 1970, which is always
                // less-than "now", so every lifetime record would wrongly appear expired.
                if ('lt'  in val) { if (fieldVal === null || fieldVal === undefined) return false; if (!(new Date(fieldVal) <  new Date(val.lt)))  return false; }
                if ('lte' in val) { if (fieldVal === null || fieldVal === undefined) return false; if (!(new Date(fieldVal) <= new Date(val.lte))) return false; }
                if ('gt'  in val) { if (fieldVal === null || fieldVal === undefined) return false; if (!(new Date(fieldVal) >  new Date(val.gt)))  return false; }
                if ('gte' in val) { if (fieldVal === null || fieldVal === undefined) return false; if (!(new Date(fieldVal) >= new Date(val.gte))) return false; }
                if ('in'  in val && !val.in.includes(fieldVal))                 return false;
                if ('not' in val && fieldVal === val.not)                        return false;
            } else {
                for (const subKey of Object.keys(val)) {
                    if (record[subKey] !== val[subKey]) return false;
                }
            }
        } else {
            if (record[key] !== val) return false;
        }
    }
    return true;
}

// ─── Model ───────────────────────────────────────────────────────────────────

class Model {
    constructor(db, name) {
        this.db   = db;
        this.name = name;
    }

    get rows() {
        if (!this.db.data[this.name]) this.db.data[this.name] = [];
        return this.db.data[this.name];
    }

    applyInclude(record, include) {
        if (!include) return record;
        const result = { ...record };
        if (this.name === 'playlist') {
            if (include.tracks) {
                result.tracks = (this.db.data['playlistTrack'] || [])
                    .filter((t) => t.playlistId === record.id)
                    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            }
            if (include._count?.select?.tracks) {
                result._count = {
                    tracks: (this.db.data['playlistTrack'] || []).filter((t) => t.playlistId === record.id).length,
                };
            }
        }
        return result;
    }

    async findUnique(args = { where: {} }) {
        const found = this.rows.find((r) => matchWhere(r, args.where));
        return found ? this.applyInclude(found, args.include) : null;
    }

    async findFirst(args = {}) {
        const found = args.where ? this.rows.find((r) => matchWhere(r, args.where)) : this.rows[0];
        return found ? this.applyInclude(found, args.include) : null;
    }

    async findMany(args = {}) {
        let results = args.where ? this.rows.filter((r) => matchWhere(r, args.where)) : [...this.rows];
        if (args.orderBy) {
            const [field] = Object.keys(args.orderBy);
            const dir     = args.orderBy[field];
            results = [...results].sort((a, b) => {
                const av = a[field], bv = b[field];
                const cmp = av > bv ? 1 : av < bv ? -1 : 0;
                return dir === 'desc' ? -cmp : cmp;
            });
        }
        if (args.include) results = results.map((r) => this.applyInclude(r, args.include));
        return results;
    }

    async create(args) {
        const record = { ...MODEL_DEFAULTS[this.name], ...args.data };
        if (AUTO_ID_MODELS.has(this.name)) {
            const maxId = this.rows.reduce((m, r) => Math.max(m, r.id || 0), 0);
            record.id   = maxId + 1;
        }
        const now = new Date().toISOString();
        if (ADDED_AT_MODELS.has(this.name)   && !record.addedAt)   record.addedAt   = now;
        if (CREATED_AT_MODELS.has(this.name) && !record.createdAt) record.createdAt = now;
        if (UPDATED_AT_MODELS.has(this.name))                       record.updatedAt = now;
        this.rows.push(record);
        this.db.save();
        return record;
    }

    async upsert(args) {
        const existing = this.rows.find((r) => matchWhere(r, args.where));
        if (existing) {
            Object.assign(existing, args.update);
            if (UPDATED_AT_MODELS.has(this.name)) existing.updatedAt = new Date().toISOString();
            this.db.save();
            return existing;
        }
        return this.create({ data: args.create });
    }

    async update(args) {
        const existing = this.rows.find((r) => matchWhere(r, args.where));
        if (!existing) throw new Error(`No ${this.name} record found to update`);
        Object.assign(existing, args.data);
        if (UPDATED_AT_MODELS.has(this.name)) existing.updatedAt = new Date().toISOString();
        this.db.save();
        return existing;
    }

    async delete(args) {
        const idx = this.rows.findIndex((r) => matchWhere(r, args.where));
        if (idx === -1) return null;
        const [removed] = this.rows.splice(idx, 1);
        if (this.name === 'playlist') {
            this.db.data['playlistTrack'] = (this.db.data['playlistTrack'] || []).filter((t) => t.playlistId !== removed.id);
        }
        this.db.save();
        return removed;
    }

    async deleteMany(args = {}) {
        const before = this.rows.length;
        this.db.data[this.name] = args.where ? this.rows.filter((r) => !matchWhere(r, args.where)) : [];
        this.db.save();
        return { count: before - this.db.data[this.name].length };
    }

    async count(args = {}) {
        return args.where ? this.rows.filter((r) => matchWhere(r, args.where)).length : this.rows.length;
    }
}

// ─── JsonDatabase ─────────────────────────────────────────────────────────────

class JsonDatabase {
    data = {};

    guildConfig  = new Model(this, 'guildConfig');
    noPrefixUser = new Model(this, 'noPrefixUser');
    premiumUser  = new Model(this, 'premiumUser');
    adminUser    = new Model(this, 'adminUser');
    vc247        = new Model(this, 'vc247');
    autoReact    = new Model(this, 'autoReact');
    autoRespond  = new Model(this, 'autoRespond');
    ignoredChannel = new Model(this, 'ignoredChannel');
    likedTrack   = new Model(this, 'likedTrack');
    playlist     = new Model(this, 'playlist');
    playlistTrack= new Model(this, 'playlistTrack');
    blacklist    = new Model(this, 'blacklist');
    userConfig   = new Model(this, 'userConfig');

    constructor() {
        this.load();
    }

    // ── Startup ──────────────────────────────────────────────────────────────

    load() {
        try {
            const dir = path.dirname(DB_FILE);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            // Recover from a previous crash that left a .tmp file behind
            if (fs.existsSync(TMP_FILE)) {
                console.warn('[JsonDatabase] Stale .tmp file detected — previous write may have been interrupted. Removing.');
                try { fs.unlinkSync(TMP_FILE); } catch {}
            }

            if (!fs.existsSync(DB_FILE)) {
                fs.writeFileSync(DB_FILE, '{}', 'utf-8');
            }

            const raw = fs.readFileSync(DB_FILE, 'utf-8');
            this.data = raw.trim() ? JSON.parse(raw) : {};
        } catch (e) {
            console.error('[JsonDatabase] Failed to load db.json, starting fresh:', e);
            this.data = {};
        }
    }

    /**
     * Atomically persist in-memory data to disk.
     *
     * Strategy: write → tmp → fsync → rename
     *   1. Write the full JSON to <db>.tmp  (new content)
     *   2. fsync the tmp file descriptor    (flush OS buffer → disk)
     *   3. fs.renameSync tmp → db.json      (atomic OS-level swap)
     *
     * If the process is killed between steps 1-2, the tmp file is incomplete
     * but db.json is still the old intact file. Step 3 is the only truly
     * dangerous moment — but rename() is atomic on POSIX (Linux/macOS), so
     * readers always see either the old or the new file, never a partial one.
     */
    save() {
        let fd;
        try {
            const json = JSON.stringify(this.data, null, 2);

            // Step 1 & 2 — write + fsync the tmp file
            fd = fs.openSync(TMP_FILE, 'w');
            fs.writeSync(fd, json, 0, 'utf-8');
            fs.fsyncSync(fd);        // <── guarantees bytes hit disk before rename
            fs.closeSync(fd);
            fd = null;

            // Step 3 — atomic rename (O(1), POSIX-atomic)
            fs.renameSync(TMP_FILE, DB_FILE);
        } catch (e) {
            console.error('[JsonDatabase] ❌ Failed to save db.json:', e);
            if (fd != null) { try { fs.closeSync(fd); } catch {} }
            // Clean up orphaned tmp so the next load() doesn't warn about it
            try { if (fs.existsSync(TMP_FILE)) fs.unlinkSync(TMP_FILE); } catch {}
        }
    }

    // ── Prisma-compatible lifecycle stubs ─────────────────────────────────────

    async $connect()    { return Promise.resolve(); }
    async $disconnect() { return Promise.resolve(); }

    // ── 3-Tier Cache Upgrade ─────────────────────────────────────────────────

    /**
     * Wraps the 6 hottest models with L1 (RAM) + L2 (Redis) caching.
     * Every caller of client.db.guildConfig / premiumUser / etc. automatically
     * gets 3-tier caching with zero code changes anywhere else.
     *
     * Called once during bot startup, after Redis is confirmed reachable.
     * If redis is null (env vars missing), this is a safe no-op.
     *
     * Cache TTLs (Redis / RAM):
     *   guildConfig   : 6 h  / 5 min  — prefix + nameplate per guild
     *   premiumUser   : 12 h / 5 min  — premium status per user
     *   userConfig    : 6 h  / 5 min  — search engine per user
     *   blacklist     : 24 h / 5 min  — blacklist per user
     *   noPrefixUser  : 24 h / 5 min  — no-prefix access per user  (was 1h — caused expiry on restart)
     *   adminUser     : 24 h / 5 min  — bot admin status per user
     */
    useRedis(redis, ramCache) {
        if (!redis) return; // not configured — stay on pure JSON DB
        const { makeCachedModel } = require('./redisCache');

        // guildId-keyed
        this.guildConfig = makeCachedModel(
            this.guildConfig, redis, ramCache,
            (w) => w?.guildId ? `aura:gc:${w.guildId}` : null,
            21600
        );

        // userId-keyed
        this.premiumUser = makeCachedModel(
            this.premiumUser, redis, ramCache,
            (w) => w?.userId ? `aura:pu:${w.userId}` : null,
            43200
        );
        this.userConfig = makeCachedModel(
            this.userConfig, redis, ramCache,
            (w) => w?.userId ? `aura:uc:${w.userId}` : null,
            21600
        );
        this.blacklist = makeCachedModel(
            this.blacklist, redis, ramCache,
            (w) => w?.userId ? `aura:bl:${w.userId}` : null,
            86400
        );
        this.noPrefixUser = makeCachedModel(
            this.noPrefixUser, redis, ramCache,
            (w) => w?.userId ? `aura:np:${w.userId}` : null,
            86400
        );
        this.adminUser = makeCachedModel(
            this.adminUser, redis, ramCache,
            (w) => w?.userId ? `aura:au:${w.userId}` : null,
            86400
        );
    }
}

exports.JsonDatabase = JsonDatabase;
