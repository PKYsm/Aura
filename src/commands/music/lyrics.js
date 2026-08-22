"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.switchMode = switchMode;
exports.buildFullTextView = buildFullTextView;
exports.attachLiveMessage = attachLiveMessage;
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const lyrics_1 = require("../../utils/lyrics");
const emojis_1 = require("../../utils/emojis");
const botInfo_1 = require("../../config/botInfo");

const WINDOW_SIZE = 4;          // synced-mode: lines shown above/below the active line
const FULL_TEXT_CHUNK = 12;     // full-text mode: lines per page
const MAX_TITLE_LEN = 40;       // shortened track name length
const CACHE_TTL = 1800;         // seconds — refreshed on every interaction/tick while a session is alive
const SYNC_INTERVAL_MS = 3000;  // how often the live synced view re-checks playback position

const FOOTER = `-# ${botInfo_1.botName} • by ${botInfo_1.developer.name}`;

function shortenTitle(title) {
    if (!title) return 'Unknown Track';
    return title.length > MAX_TITLE_LEN ? `${title.slice(0, MAX_TITLE_LEN - 1).trim()}…` : title;
}

function trackKeyOf(track) {
    return track ? `${track.title}::${track.author || ''}` : null;
}

function chunkLines(lines, size) {
    const pages = [];
    for (let i = 0; i < lines.length; i += size) {
        pages.push(lines.slice(i, i + size).join('\n') || '\u200b');
    }
    return pages.length ? pages : ['\u200b'];
}

/** True only while the exact track this session was built for is actively playing right now. */
function isLiveEligible(data, client, guildId) {
    if (!data.synced.length) return false;
    const player = client.music?.players?.get(guildId);
    const current = player?.queue?.current;
    if (!current || !player.playing) return false;
    return trackKeyOf(current) === data.meta.trackKey;
}

function buildModeSelectRow(cacheKey, data, syncEligible) {
    const options = [];
    if (syncEligible) {
        options.push({ label: 'Synced Lyrics', description: 'Auto-follows the currently playing track', value: 'sync', emoji: emojis_1.default.lyrics.sync, default: data.mode === 'sync' });
    }
    options.push({ label: 'Full Text', description: `All lyrics, ${data.fullPages.length} page(s)`, value: 'full', emoji: emojis_1.default.lyrics.full, default: data.mode === 'full' || !syncEligible });
    const select = new discord_js_1.StringSelectMenuBuilder()
        .setCustomId(`AuraX:lyrics_mode:${cacheKey}`)
        .setPlaceholder('View mode…')
        .addOptions(options);
    return new discord_js_1.ActionRowBuilder().addComponents(select);
}

function buildPageSelectRow(cacheKey, data) {
    const total = data.fullPages.length;
    const options = [];
    for (let i = 0; i < Math.min(total, 25); i++) {
        options.push({ label: `Page ${i + 1} / ${total}`, value: String(i), emoji: emojis_1.default.lyrics.page, default: i === data.fullPage });
    }
    const select = new discord_js_1.StringSelectMenuBuilder()
        .setCustomId(`AuraX:lyrics_page:${cacheKey}`)
        .setPlaceholder(`Page ${data.fullPage + 1} of ${total}`)
        .addOptions(options);
    return new discord_js_1.ActionRowBuilder().addComponents(select);
}

function renderSynced(cacheKey, data, client, guildId) {
    const idx = Math.max(0, (0, lyrics_1.getCurrentLineIndex)(data.synced, client.music?.players?.get(guildId)?.position || 0));
    const start = Math.max(0, idx - WINDOW_SIZE);
    const end = Math.min(data.synced.length, idx + WINDOW_SIZE + 1);
    const rendered = data.synced.slice(start, end).map((line, i) => {
        const realIdx = start + i;
        return realIdx === idx ? `**${emojis_1.default.lyrics.sync} ${line.text}**` : line.text;
    }).join('\n');
    const c = (0, containers_1.container)(`${rendered}\n\n${FOOTER}`, {
        title: `${emojis_1.default.lyrics.mic} ${shortenTitle(data.meta.title)}${data.meta.artist ? ` — ${data.meta.artist}` : ''}`,
    });
    c.addActionRowComponents(buildModeSelectRow(cacheKey, data, true));
    return c;
}

function renderFullText(cacheKey, data, client, guildId) {
    const syncEligible = isLiveEligible(data, client, guildId);
    const page = data.fullPages[data.fullPage];
    const c = (0, containers_1.container)(`${page}\n\n${FOOTER}`, {
        title: `${emojis_1.default.lyrics.mic} ${shortenTitle(data.meta.title)}${data.meta.artist ? ` — ${data.meta.artist}` : ''}`,
    });
    c.addActionRowComponents(buildModeSelectRow(cacheKey, data, syncEligible));
    if (data.fullPages.length > 1) {
        c.addActionRowComponents(buildPageSelectRow(cacheKey, data));
    }
    return c;
}

function renderEnded(title, artist, reasonText) {
    return (0, containers_1.container)(`${emojis_1.default.lyrics.ended} ${reasonText}\n\n${FOOTER}`, {
        title: `${emojis_1.default.lyrics.mic} ${shortenTitle(title)}${artist ? ` — ${artist}` : ''}`,
        color: 'warning',
    });
}

function renderView(cacheKey, data, client, guildId) {
    return data.mode === 'sync'
        ? renderSynced(cacheKey, data, client, guildId)
        : renderFullText(cacheKey, data, client, guildId);
}

/** Persists the requested mode (falling back to Full Text if Sync isn't currently eligible) and renders it. */
function switchMode(cacheKey, requestedMode, client, guildId) {
    const data = client.cache.get(cacheKey);
    if (!data) return { expired: true, container: (0, containers_1.error)('This lyrics session expired. Run `/lyrics` again.') };
    data.mode = (requestedMode === 'sync' && isLiveEligible(data, client, guildId)) ? 'sync' : 'full';
    client.cache.set(cacheKey, data, CACHE_TTL);
    if (data.mode !== 'sync') {
        stopLiveSession(client, guildId, cacheKey);
    }
    return { expired: false, container: renderView(cacheKey, data, client, guildId) };
}

function buildFullTextView(cacheKey, pageIndex, client) {
    const data = client.cache.get(cacheKey);
    if (!data) return { expired: true, container: (0, containers_1.error)('This lyrics session expired. Run `/lyrics` again.') };
    data.fullPage = Math.max(0, Math.min(pageIndex, data.fullPages.length - 1));
    data.mode = 'full';
    client.cache.set(cacheKey, data, CACHE_TTL);
    return { expired: false, container: renderFullText(cacheKey, data, client, data.meta.guildId) };
}

/** Silently stops the live-refresh interval for a cacheKey's message (no message edit — caller re-renders separately). */
function stopLiveSession(client, guildId, cacheKey) {
    const guildMap = client.lyricSyncSessions.get(guildId);
    if (!guildMap) return;
    for (const [messageId, session] of guildMap) {
        if (session.cacheKey !== cacheKey) continue;
        clearInterval(session.intervalId);
        guildMap.delete(messageId);
    }
}

async function tick(client, guildId, messageId) {
    const guildMap = client.lyricSyncSessions.get(guildId);
    const session = guildMap?.get(messageId);
    if (!session) return;
    const player = client.music?.players?.get(guildId);
    const current = player?.queue?.current;
    if (!player || !current || !player.playing || trackKeyOf(current) !== session.trackKey) {
        clearInterval(session.intervalId);
        guildMap.delete(messageId);
        session.message.edit((0, containers_1.cv2)(renderEnded(session.title, session.artist, 'Track ended — synced lyrics session closed.'))).catch(() => { });
        client.cache.del(session.cacheKey);
        return;
    }
    const data = client.cache.get(session.cacheKey);
    if (!data) {
        clearInterval(session.intervalId);
        guildMap.delete(messageId);
        return;
    }
    const idx = (0, lyrics_1.getCurrentLineIndex)(data.synced, player.position);
    if (idx === session.lastIndex) return;
    session.lastIndex = idx;
    client.cache.set(session.cacheKey, data, CACHE_TTL);
    await session.message.edit((0, containers_1.cv2)(renderSynced(session.cacheKey, data, client, guildId))).catch(() => {
        clearInterval(session.intervalId);
        guildMap.delete(messageId);
    });
}

/** Call right after sending/updating a message that may be in synced mode — (re)starts or stops its live interval. */
function attachLiveMessage(cacheKey, client, message) {
    if (!message) return;
    const data = client.cache.get(cacheKey);
    if (!data) return;
    const guildId = data.meta.guildId;
    stopLiveSession(client, guildId, cacheKey);
    if (data.mode !== 'sync') return;
    let guildMap = client.lyricSyncSessions.get(guildId);
    if (!guildMap) {
        guildMap = new discord_js_1.Collection();
        client.lyricSyncSessions.set(guildId, guildMap);
    }
    const session = {
        cacheKey,
        trackKey: data.meta.trackKey,
        message,
        title: data.meta.title,
        artist: data.meta.artist,
        lastIndex: (0, lyrics_1.getCurrentLineIndex)(data.synced, client.music?.players?.get(guildId)?.position || 0),
    };
    session.intervalId = setInterval(() => tick(client, guildId, message.id), SYNC_INTERVAL_MS);
    guildMap.set(message.id, session);
}

exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Get synced or full-text lyrics for the current song, or search for one.')
        .addStringOption(o => o.setName('song').setDescription('Song to search for (defaults to the currently playing track)').setRequired(false)),
    category: 'music',
    aliases: ['ly'],

    async prefixExecute(client, message, args) {
        await this.handleAction(client, message, args.join(' ') || null);
    },
    async execute(interaction, client) {
        await interaction.deferReply();
        await this.handleAction(client, interaction, interaction.options.getString('song'));
    },

    async handleAction(client, context, songQuery) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.editReply(content) : context.reply(content);
        const guildId = context.guildId;
        const player = client.music?.players?.get(guildId);

        let title, artist, durationMs;
        if (songQuery) {
            title = songQuery;
            artist = '';
        }
        else if (player?.queue?.current) {
            title = player.queue.current.title;
            artist = player.queue.current.author || '';
            durationMs = player.queue.current.length;
        }
        else {
            const c = (0, containers_1.container)('Nothing is playing right now. Search for a song to see its lyrics — synced mode will only be available once it\'s actually playing.', { title: `${emojis_1.default.lyrics.mic} Lyrics` });
            const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                .setCustomId('AuraX:lyrics_search_btn')
                .setLabel('Search Lyrics')
                .setEmoji(emojis_1.default.lyrics.search)
                .setStyle(discord_js_1.ButtonStyle.Secondary));
            c.addActionRowComponents(row);
            return reply((0, containers_1.cv2)(c));
        }

        const result = await (0, lyrics_1.fetchLyrics)(title, artist, durationMs);
        if (!result) {
            return reply((0, containers_1.cv2)((0, containers_1.error)(`No lyrics found for **${shortenTitle(title)}**${artist ? ` by **${artist}**` : ''}.`)));
        }

        const trackKey = `${title}::${artist}`;
        const fullPages = result.synced.length > 0
            ? chunkLines(result.synced.map(l => l.text), FULL_TEXT_CHUNK)
            : chunkLines((result.plain || 'No lyrics text available.').split('\n'), FULL_TEXT_CHUNK);

        const cacheKey = `lyrics_${guildId || context.channelId}_${Date.now()}`;
        const liveNow = player?.queue?.current && trackKeyOf(player.queue.current) === trackKey;
        const data = {
            meta: { title, artist, trackKey, guildId },
            synced: result.synced,
            fullPages,
            fullPage: 0,
            mode: (result.synced.length > 0 && liveNow) ? 'sync' : 'full',
        };
        client.cache.set(cacheKey, data, CACHE_TTL);

        const view = renderView(cacheKey, data, client, guildId);
        const sentMessage = await reply((0, containers_1.cv2)(view));
        attachLiveMessage(cacheKey, client, sentMessage);
    }
};
