"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.switchMode = switchMode;
exports.buildFullTextView = buildFullTextView;
exports.attachLiveMessage = attachLiveMessage;
exports.deleteLyricsSession = deleteLyricsSession;
exports.endLyricsSessions = endLyricsSessions;
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const lyrics_1 = require("../../utils/lyrics");
const botInfo_1 = require("../../config/botInfo");

const WINDOW_SIZE = 5;          // synced-mode: lines shown above/below the active line (>=10 lines total mid-song)
const FULL_TEXT_CHUNK = 12;     // full-text mode: lines per page
const MAX_TITLE_LEN = 30;       // shortened track name length
const CACHE_TTL = 1800;         // seconds — refreshed on every interaction/tick while a session is alive
const SYNC_INTERVAL_MS = 2000;  // how often the live synced view re-checks playback position
const SYNC_OFFSET_MS = 3000;    // nudges lyric lookup this far ahead of raw playback position to cancel out source delay

const FOOTER = `-# ${botInfo_1.botName} • by ${botInfo_1.developer.name}`;
const SOURCE_LABELS = { youtube: 'YouTube', spotify: 'Spotify', soundcloud: 'SoundCloud', jiosaavn: 'JioSaavn', deezer: 'Deezer' };

/** Strips hashtags and @mentions out of a track title before it's ever shown. */
function cleanDisplayTitle(title) {
    if (!title) return '';
    return title
        .replace(/<@!?\d+>/g, '')
        .replace(/#\S+/g, '')
        .replace(/@\S+/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function shortenTitle(title) {
    const clean = cleanDisplayTitle(title) || 'Unknown Track';
    return clean.length > MAX_TITLE_LEN ? `${clean.slice(0, MAX_TITLE_LEN - 1).trim()}…` : clean;
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
    if (!current) return false;
    return trackKeyOf(current) === data.meta.trackKey;
}

/** Track title as a clickable link (falls back to plain text when there's no URI). Artist is opt-in — the
 *  synced view intentionally omits it, matching how it's shown there. */
function titleLine(data, includeArtist = true) {
    const label = shortenTitle(data.meta.title);
    const linked = data.meta.uri ? `[${label}](${data.meta.uri})` : label;
    return (includeArtist && data.meta.artist) ? `${linked} — ${data.meta.artist}` : linked;
}

function formatTime(ms) {
    const totalSec = Math.max(0, Math.floor((ms || 0) / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function progressBar(position, duration, size = 15) {
    if (!duration) return '';
    const ratio = Math.min(Math.max(position / duration, 0), 1);
    const knobPos = Math.min(size - 1, Math.round(ratio * (size - 1)));
    let bar = '';
    for (let i = 0; i < size; i++) {
        if (i < knobPos) bar += '━';
        else if (i === knobPos) bar += '〇';
        else bar += '┄';
    }
    return bar;
}

function renderSynced(cacheKey, data, client, guildId) {
    const player = client.music?.players?.get(guildId);
    const position = player?.position || 0;
    const duration = player?.queue?.current?.length || data.meta.durationMs || 0;
    const idx = Math.max(0, (0, lyrics_1.getCurrentLineIndex)(data.synced, position + SYNC_OFFSET_MS));
    const start = Math.max(0, idx - WINDOW_SIZE);
    const end = Math.min(data.synced.length, idx + WINDOW_SIZE + 1);
    const rendered = data.synced.slice(start, end).map((line, i) => {
        const realIdx = start + i;
        return realIdx === idx ? `> **__${line.text}__**` : `> ${line.text}`;
    }).join('\n');

    const lines = [`## ${titleLine(data, false)}`];
    if (duration) {
        lines.push(`${formatTime(position)} \`${progressBar(position, duration)}\` ${formatTime(duration)}`);
    }
    lines.push('', rendered, '', FOOTER);

    return (0, containers_1.container)(lines.join('\n'));
}

function renderFullText(cacheKey, data, client, guildId) {
    const total = data.fullPages.length;
    const page = data.fullPages[data.fullPage];
    const headerBits = [`__${titleLine(data)}__`];
    if (total > 1) headerBits.push(`Page ${data.fullPage + 1}/${total}`);
    const content = `${headerBits.join('  •  ')}\n\n${page}\n\n${FOOTER}`;
    const c = (0, containers_1.container)(content);

    const syncEligible = isLiveEligible(data, client, guildId);
    const buttons = [
        new discord_js_1.ButtonBuilder()
            .setCustomId(`AuraX:lyrics_prev_page:${cacheKey}`)
            .setLabel('◀')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setDisabled(total <= 1 || data.fullPage <= 0),
    ];
    if (syncEligible) {
        buttons.push(new discord_js_1.ButtonBuilder()
            .setCustomId(`AuraX:lyrics_sync:${cacheKey}`)
            .setLabel('Sync Lyrics')
            .setStyle(discord_js_1.ButtonStyle.Primary));
    }
    buttons.push(new discord_js_1.ButtonBuilder()
        .setCustomId(`AuraX:lyrics_delete:${cacheKey}`)
        .setLabel('Delete')
        .setStyle(discord_js_1.ButtonStyle.Danger));
    buttons.push(new discord_js_1.ButtonBuilder()
        .setCustomId(`AuraX:lyrics_next_page:${cacheKey}`)
        .setLabel('▶')
        .setStyle(discord_js_1.ButtonStyle.Secondary)
        .setDisabled(total <= 1 || data.fullPage >= total - 1));

    c.addActionRowComponents(new discord_js_1.ActionRowBuilder().addComponents(...buttons));
    return c;
}

/** No track heading — matches the "cleared" state shown once a synced session is no longer valid. */
function renderEnded(reasonText) {
    const c = new discord_js_1.ContainerBuilder();
    c.setAccentColor(containers_1.THEME_COLOR);
    c.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent('**Synced lyrics cleared**'));
    c.addSeparatorComponents(new discord_js_1.SeparatorBuilder());
    c.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(`-# reason \`${reasonText}\``));
    return c;
}

/** First screen after `/lyrics` runs — title/artist/source plus an explicit Sync-vs-Static choice. */
function renderChoice(cacheKey, data, client, guildId) {
    const label = shortenTitle(data.meta.title);
    const linked = data.meta.uri ? `[${label}](${data.meta.uri})` : label;
    const lines = [
        `## ${linked}`,
        `> **Artist:** ${data.meta.artist || 'Unknown'}`,
        `> **Source:** ${data.meta.source || 'Unknown'}`,
        '',
        FOOTER,
    ];
    const c = (0, containers_1.container)(lines.join('\n'));

    const buttons = [];
    if (isLiveEligible(data, client, guildId)) {
        buttons.push(new discord_js_1.ButtonBuilder()
            .setCustomId(`AuraX:lyrics_pick_sync:${cacheKey}`)
            .setLabel('Sync Lyrics')
            .setStyle(discord_js_1.ButtonStyle.Primary));
    }
    buttons.push(new discord_js_1.ButtonBuilder()
        .setCustomId(`AuraX:lyrics_pick_full:${cacheKey}`)
        .setLabel('Static Lyrics')
        .setStyle(discord_js_1.ButtonStyle.Secondary));
    c.addActionRowComponents(new discord_js_1.ActionRowBuilder().addComponents(...buttons));
    return c;
}

function renderView(cacheKey, data, client, guildId) {
    if (data.mode === 'sync') return renderSynced(cacheKey, data, client, guildId);
    if (data.mode === 'full') return renderFullText(cacheKey, data, client, guildId);
    return renderChoice(cacheKey, data, client, guildId);
}

/** Persists the requested mode (falling back to Full Text if Sync isn't currently eligible) and renders it. */
function switchMode(cacheKey, requestedMode, client, guildId) {
    const data = client.cache.get(cacheKey);
    if (!data) return { expired: true, container: (0, containers_1.container)('This lyrics session expired. Run `/lyrics` again.') };
    data.mode = (requestedMode === 'sync' && isLiveEligible(data, client, guildId)) ? 'sync' : 'full';
    client.cache.set(cacheKey, data, CACHE_TTL);
    if (data.mode !== 'sync') {
        stopLiveSession(client, guildId, cacheKey);
    }
    return { expired: false, container: renderView(cacheKey, data, client, guildId) };
}

function buildFullTextView(cacheKey, pageIndex, client) {
    const data = client.cache.get(cacheKey);
    if (!data) return { expired: true, container: (0, containers_1.container)('This lyrics session expired. Run `/lyrics` again.') };
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

/** Deletes the cached lyrics session (used by the Delete button). Message deletion is the caller's job. */
function deleteLyricsSession(cacheKey, client, guildId) {
    stopLiveSession(client, guildId, cacheKey);
    client.cache.del(cacheKey);
}

/** Ends every live synced session in a guild — call on track end, skip, previous, or bot disconnect. */
async function endLyricsSessions(client, guildId, reasonText) {
    const guildMap = client.lyricSyncSessions.get(guildId);
    if (!guildMap || !guildMap.size) return;
    const sessions = Array.from(guildMap.values());
    guildMap.clear();
    for (const session of sessions) {
        clearInterval(session.intervalId);
        client.cache.del(session.cacheKey);
        await session.message.edit((0, containers_1.cv2)(renderEnded(reasonText))).catch(() => { });
    }
}

async function tick(client, guildId, messageId) {
    const guildMap = client.lyricSyncSessions.get(guildId);
    const session = guildMap?.get(messageId);
    if (!session) return;
    const player = client.music?.players?.get(guildId);
    const current = player?.queue?.current;

    let reason = null;
    if (!player) reason = 'Bot left the voice channel — synced lyrics session closed.';
    else if (!current) reason = 'Queue ended — synced lyrics session closed.';
    else if (trackKeyOf(current) !== session.trackKey) reason = 'Track changed — synced lyrics session closed.';

    if (reason) {
        clearInterval(session.intervalId);
        guildMap.delete(messageId);
        client.cache.del(session.cacheKey);
        await session.message.edit((0, containers_1.cv2)(renderEnded(reason))).catch(() => { });
        return;
    }

    const data = client.cache.get(session.cacheKey);
    if (!data) {
        clearInterval(session.intervalId);
        guildMap.delete(messageId);
        return;
    }
    // Always edit on every tick (not only when the active line changes) — otherwise the progress bar
    // and timestamp go stale between line changes, and edits end up landing on whatever irregular
    // gap separates two lyric lines instead of a steady 2s cadence.
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

        let title, artist, durationMs, uri, source;
        if (songQuery) {
            title = songQuery;
            artist = '';
        }
        else if (player?.queue?.current) {
            title = player.queue.current.title;
            artist = player.queue.current.author || '';
            durationMs = player.queue.current.length;
            uri = player.queue.current.uri;
            const rawSource = player.queue.current.sourceName?.toLowerCase();
            source = rawSource ? (SOURCE_LABELS[rawSource] || player.queue.current.sourceName) : undefined;
        }
        else {
            const c = (0, containers_1.container)('Nothing is playing right now. Search for a song to see its lyrics — synced mode will only be available once it\'s actually playing.', { title: 'Lyrics' });
            const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                .setCustomId('AuraX:lyrics_search_btn')
                .setLabel('Search Lyrics')
                .setStyle(discord_js_1.ButtonStyle.Secondary));
            c.addActionRowComponents(row);
            return reply((0, containers_1.cv2)(c));
        }

        const result = await (0, lyrics_1.fetchLyrics)(title, artist, durationMs);
        if (!result) {
            return reply((0, containers_1.cv2)((0, containers_1.container)(`No lyrics found for **${shortenTitle(title)}**${artist ? ` by **${artist}**` : ''}.`)));
        }

        const trackKey = `${title}::${artist}`;
        const fullPages = result.synced.length > 0
            ? chunkLines(result.synced.map(l => l.text), FULL_TEXT_CHUNK)
            : chunkLines((result.plain || 'No lyrics text available.').split('\n'), FULL_TEXT_CHUNK);

        const cacheKey = `lyrics_${guildId || context.channelId}_${Date.now()}`;
        const data = {
            meta: { title, artist, uri, durationMs, trackKey, guildId, source },
            synced: result.synced,
            fullPages,
            fullPage: 0,
            mode: 'choice',
        };
        client.cache.set(cacheKey, data, CACHE_TTL);

        const view = renderView(cacheKey, data, client, guildId);
        const sentMessage = await reply((0, containers_1.cv2)(view));
        attachLiveMessage(cacheKey, client, sentMessage);
    }
};
