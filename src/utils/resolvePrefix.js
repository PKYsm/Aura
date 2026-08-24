"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePrefix = resolvePrefix;

/**
 * Resolves the effective prefix for a context, in order:
 *   1. The user's own prefix override, if userId is given.
 *   2. The guild's custom prefix (set via /bprefix), if guildId is given.
 *   3. The bot's default prefix (PREFIX env var, or '$').
 *
 * NOTE: userConfig has no `prefix` field yet (only searchEngine) — tier 1
 * currently never matches, so this behaves as a 2-tier guild/bot fallback
 * today. It's written as 3 tiers so a per-user prefix "just works" the
 * moment that field is added to userConfig, with no caller changes needed.
 */
async function resolvePrefix(client, guildId, userId) {
    const botDefault = process.env.PREFIX || '$';
    try {
        if (userId) {
            const userConfig = await client.db.userConfig.findUnique({ where: { userId } });
            if (userConfig?.prefix)
                return userConfig.prefix;
        }
    }
    catch { }
    try {
        if (guildId) {
            const guildConfig = await client.db.guildConfig.findUnique({ where: { guildId } });
            if (guildConfig?.prefix)
                return guildConfig.prefix;
        }
    }
    catch { }
    return botDefault;
}
