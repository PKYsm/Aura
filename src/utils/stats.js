"use strict";

/**
 * ─── Lifetime Stats Tracker ───────────────────────────────────────────────────
 *
 * Stores bot-wide lifetime counters directly in Redis (no TTL = permanent).
 * Uses Redis native commands for atomic, lock-free increments:
 *   INCR  → for simple counters (commands, songs)
 *   SADD  → for unique sets    (users, guilds)
 *   SCARD → to count unique set members
 *
 * Keys stored in Redis:
 *   aura:stats:commands          → total commands executed (number)
 *   aura:stats:songs             → total songs played      (number)
 *   aura:stats:cmd:{name}        → per-command count       (number)
 *   aura:stats:users             → unique user IDs         (Set)
 *   aura:stats:guilds            → unique guild IDs        (Set)
 *
 * Usage:
 *   const stats = require('./utils/stats');
 *   await stats.trackCommand('play', userId, guildId);
 *   await stats.trackSong();
 *   const all = await stats.getAll();
 */

const { getRedis } = require('./redisCache');

// ─── Key Names ─────────────────────────────────────────────────────────────────
const K = {
    commands:  'aura:stats:commands',
    songs:     'aura:stats:songs',
    users:     'aura:stats:users',   // Redis Set
    guilds:    'aura:stats:guilds',  // Redis Set
    cmd:       (name) => `aura:stats:cmd:${name}`,
};

// ─── Core ──────────────────────────────────────────────────────────────────────

/**
 * Track a command execution.
 * Call this every time any command runs successfully.
 *
 * @param {string} commandName - e.g. 'play', 'search', 'np'
 * @param {string} userId      - Discord user ID
 * @param {string} guildId     - Discord guild ID
 */
async function trackCommand(commandName, userId, guildId) {
    const redis = getRedis();
    if (!redis) return;
    try {
        await Promise.all([
            redis.incr(K.commands),            // total commands++
            redis.incr(K.cmd(commandName)),    // this command's count++
            userId  && redis.sadd(K.users,  userId),   // unique users set
            guildId && redis.sadd(K.guilds, guildId),  // unique guilds set
        ].filter(Boolean));
    } catch (e) {
        // Stats are non-critical — never let a failure affect the bot
    }
}

/**
 * Track a song being played.
 * Call this when a track starts playing (in trackStart event).
 */
async function trackSong() {
    const redis = getRedis();
    if (!redis) return;
    try {
        await redis.incr(K.songs);
    } catch (e) {}
}

/**
 * Get all lifetime stats as a plain object.
 * Returns zeros if Redis is unavailable.
 *
 * @returns {{ commands, songs, users, guilds, topCommands }}
 */
async function getAll() {
    const redis = getRedis();
    if (!redis) return { commands: 0, songs: 0, users: 0, guilds: 0, topCommands: [] };

    try {
        const [commands, songs, users, guilds] = await Promise.all([
            redis.get(K.commands),
            redis.get(K.songs),
            redis.scard(K.users),
            redis.scard(K.guilds),
        ]);

        // Fetch all per-command keys for top commands
        const cmdKeys = await redis.keys('aura:stats:cmd:*');
        let topCommands = [];
        if (cmdKeys.length > 0) {
            const counts = await Promise.all(cmdKeys.map(k => redis.get(k)));
            topCommands = cmdKeys
                .map((k, i) => ({ name: k.replace('aura:stats:cmd:', ''), count: parseInt(counts[i] || 0) }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10); // top 10
        }

        return {
            commands:    parseInt(commands  || 0),
            songs:       parseInt(songs     || 0),
            users:       parseInt(users     || 0),
            guilds:      parseInt(guilds    || 0),
            topCommands,
        };
    } catch (e) {
        return { commands: 0, songs: 0, users: 0, guilds: 0, topCommands: [] };
    }
}

/**
 * Reset all stats (owner only — use carefully).
 */
async function resetAll() {
    const redis = getRedis();
    if (!redis) return;
    try {
        const keys = await redis.keys('aura:stats:*');
        if (keys.length > 0) await redis.del(...keys);
    } catch (e) {}
}

module.exports = { trackCommand, trackSong, getAll, resetAll };
