"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonDatabase = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Zero-setup JSON-file database.
 * Drop-in replacement for the Prisma client used across this codebase —
 * same method names/shapes (findUnique, findFirst, findMany, create, upsert, delete),
 * but backed by a single local JSON file instead of SQLite/Prisma.
 *
 * No `prisma generate`, no `prisma db push`, no native engine binaries.
 * The file is created automatically on first run at ./data/db.json
 */
const DB_FILE = path_1.default.join(process.cwd(), 'data', 'db.json');
const MODEL_DEFAULTS = {
    guildConfig: {
        prefix: '$',
        nameplateFontId: 11,
        nameplateEffectId: 1,
        nameplateColors: '16777215',
        nameplateHex: '#FFFFFF',
    },
    premiumUser: { tier: 1 },
    userConfig: { searchEngine: 'spsearch' },
};
const AUTO_ID_MODELS = new Set([
    'autoReact',
    'autoRespond',
    'ignoredChannel',
    'likedTrack',
    'playlist',
    'playlistTrack',
]);
const ADDED_AT_MODELS = new Set(['noPrefixUser', 'premiumUser', 'adminUser', 'likedTrack', 'blacklist']);
const CREATED_AT_MODELS = new Set(['guildConfig', 'playlist']);
const UPDATED_AT_MODELS = new Set(['guildConfig', 'userConfig']);
const OPERATOR_KEYS = ['lt', 'lte', 'gt', 'gte', 'in', 'not'];
function isPlainObject(val) {
    return val !== null && typeof val === 'object' && !(val instanceof Date) && !Array.isArray(val);
}
function matchWhere(record, where) {
    if (!where)
        return true;
    for (const key of Object.keys(where)) {
        const val = where[key];
        if (isPlainObject(val)) {
            const isOperatorObj = Object.keys(val).some((k) => OPERATOR_KEYS.includes(k));
            if (isOperatorObj) {
                const fieldVal = record[key];
                if ('lt' in val && !(new Date(fieldVal) < new Date(val.lt)))
                    return false;
                if ('lte' in val && !(new Date(fieldVal) <= new Date(val.lte)))
                    return false;
                if ('gt' in val && !(new Date(fieldVal) > new Date(val.gt)))
                    return false;
                if ('gte' in val && !(new Date(fieldVal) >= new Date(val.gte)))
                    return false;
                if ('in' in val && !val.in.includes(fieldVal))
                    return false;
                if ('not' in val && fieldVal === val.not)
                    return false;
            }
            else {
                // Composite unique key, e.g. { guildId_channelId: { guildId, channelId } }
                for (const subKey of Object.keys(val)) {
                    if (record[subKey] !== val[subKey])
                        return false;
                }
            }
        }
        else {
            if (record[key] !== val)
                return false;
        }
    }
    return true;
}
class Model {
    db;
    name;
    constructor(db, name) {
        this.db = db;
        this.name = name;
    }
    get rows() {
        if (!this.db.data[this.name])
            this.db.data[this.name] = [];
        return this.db.data[this.name];
    }
    applyInclude(record, include) {
        if (!include)
            return record;
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
            const dir = args.orderBy[field];
            results = [...results].sort((a, b) => {
                const av = a[field];
                const bv = b[field];
                const cmp = av > bv ? 1 : av < bv ? -1 : 0;
                return dir === 'desc' ? -cmp : cmp;
            });
        }
        if (args.include)
            results = results.map((r) => this.applyInclude(r, args.include));
        return results;
    }
    async create(args) {
        const record = { ...MODEL_DEFAULTS[this.name], ...args.data };
        if (AUTO_ID_MODELS.has(this.name)) {
            const maxId = this.rows.reduce((m, r) => Math.max(m, r.id || 0), 0);
            record.id = maxId + 1;
        }
        const now = new Date().toISOString();
        if (ADDED_AT_MODELS.has(this.name) && !record.addedAt)
            record.addedAt = now;
        if (CREATED_AT_MODELS.has(this.name) && !record.createdAt)
            record.createdAt = now;
        if (UPDATED_AT_MODELS.has(this.name))
            record.updatedAt = now;
        this.rows.push(record);
        this.db.save();
        return record;
    }
    async upsert(args) {
        const existing = this.rows.find((r) => matchWhere(r, args.where));
        if (existing) {
            Object.assign(existing, args.update);
            if (UPDATED_AT_MODELS.has(this.name))
                existing.updatedAt = new Date().toISOString();
            this.db.save();
            return existing;
        }
        return this.create({ data: args.create });
    }
    async update(args) {
        const existing = this.rows.find((r) => matchWhere(r, args.where));
        if (!existing)
            throw new Error(`No ${this.name} record found to update`);
        Object.assign(existing, args.data);
        if (UPDATED_AT_MODELS.has(this.name))
            existing.updatedAt = new Date().toISOString();
        this.db.save();
        return existing;
    }
    async delete(args) {
        const idx = this.rows.findIndex((r) => matchWhere(r, args.where));
        if (idx === -1)
            return null;
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
class JsonDatabase {
    data = {};
    guildConfig = new Model(this, 'guildConfig');
    noPrefixUser = new Model(this, 'noPrefixUser');
    premiumUser = new Model(this, 'premiumUser');
    adminUser = new Model(this, 'adminUser');
    vc247 = new Model(this, 'vc247');
    autoReact = new Model(this, 'autoReact');
    autoRespond = new Model(this, 'autoRespond');
    ignoredChannel = new Model(this, 'ignoredChannel');
    likedTrack = new Model(this, 'likedTrack');
    playlist = new Model(this, 'playlist');
    playlistTrack = new Model(this, 'playlistTrack');
    blacklist = new Model(this, 'blacklist');
    userConfig = new Model(this, 'userConfig');
    constructor() {
        this.load();
    }
    load() {
        try {
            if (!fs_1.default.existsSync(path_1.default.dirname(DB_FILE))) {
                fs_1.default.mkdirSync(path_1.default.dirname(DB_FILE), { recursive: true });
            }
            if (!fs_1.default.existsSync(DB_FILE)) {
                fs_1.default.writeFileSync(DB_FILE, '{}', 'utf-8');
            }
            const raw = fs_1.default.readFileSync(DB_FILE, 'utf-8');
            this.data = raw.trim() ? JSON.parse(raw) : {};
        }
        catch (e) {
            console.error('[JsonDatabase] Failed to load db.json, starting fresh:', e);
            this.data = {};
        }
    }
    save() {
        try {
            fs_1.default.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
        }
        catch (e) {
            console.error('[JsonDatabase] Failed to save db.json:', e);
        }
    }
    // Matches Prisma's connect call so bot.ts's startup animation keeps working unchanged.
    async $connect() {
        return Promise.resolve();
    }
    async $disconnect() {
        return Promise.resolve();
    }
}
exports.JsonDatabase = JsonDatabase;
