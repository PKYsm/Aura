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
const format_1 = require("../../utils/format");
const trackTitle_1 = require("../../utils/trackTitle");

const WINDOW_SIZE = 5;          // synced-mode: lines shown above/below the active line (>=10 lines total mid-song)
const FULL_TEXT_CHUNK = 12;     // full-text mode: lines per page
const LINE_WRAP_LEN = 40;       // wrap any single lyric line beyond this many characters (any language)
const CACHE_TTL = 1800;         // seconds — refreshed on every interaction/tick while a session is alive
const SYNC_INTERVAL_MS = 2000;  // how often the live synced view re-checks playback position
const SYNC_OFFSET_MS = 3000;    // nudges lyric lookup this far ahead of raw playback position to cancel out source delay

const FOOTER = `-# ${botInfo_1.botName} • by ${botInfo_1.developer.name}`;
const SOURCE_LABELS = { youtube: 'YouTube', spotify: 'Spotify', soundcloud: 'SoundCloud', jiosaavn: 'JioSaavn', deezer: 'Deezer' };

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

/** Greedy word-wrap — breaks text into chunks no longer than maxLen, splitting only on spaces
 *  (works for any space-delimited script: English, Hindi, Punjabi, etc). */
function wrapText(text, maxLen) {
    if (!text || text.length <= maxLen) return [text || '\u200b'];
    const words = text.split(' ');
    const chunks = [];
    let current = '';
    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length > maxLen && current) {
            chunks.push(current);
            current = word;
        }
        else {
            current = candidate;
        }
    }
    if (current) chunks.push(current);
    return chunks.length ? chunks : ['\u200b'];
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
 *  synced view intentionally omits it, matching how it's shown there.
 *  Always uses Infinity so the full cleaned title is shown (no truncation, no hashtags/mentions). */
function titleLine(data, includeArtist = true) {
    const linked = (0, trackTitle_1.clickableTitle)(data.meta.title, data.meta.uri, Infinity);
    return (includeArtist && data.meta.artist) ? `${linked} — ${data.meta.artist}` : linked;
}

function renderSynced(cacheKey, data, client, guildId, overridePosition) {
    const player = client.music?.players?.get(guildId);
    const position = overridePosition !== undefined ? overridePosition : (player?.position || 0);
    const duration = player?.queue?.current?.length || data.meta.durationMs || 0;
    const idx = Math.max(0, (0, lyrics_1.getCurrentLineIndex)(data.synced, position + SYNC_OFFSET_MS));
    const start = Math.max(0, idx - WINDOW_SIZE);
    const end = Math.min(data.synced.length, idx + WINDOW_SIZE + 1);
    const rendered = data.synced.slice(start, end).map((line, i) => {
        const realIdx = start + i;
        // Current line: wrapped chunks, each bold+underlined, no indent.
        if (realIdx === idx) {
            return wrapText(line.text, LINE_WRAP_LEN).map(c => `> **__${c}__**`).join('\n');
        }
        // Past/upcoming lines: wrapped chunks, each indented 4 spaces. Past lines additionally
        // render as subtext (-#) so they read as visually "done" against the current line.
        const indentedChunks = wrapText(line.text, LINE_WRAP_LEN).map(c => `    ${c}`);
        return realIdx < idx
            ? indentedChunks.map(c => `> -# ${c}`).join('\n')
            : indentedChunks.map(c => `> ${c}`).join('\n');
    }).join('\n');

    // Build the container manually so we can insert a native Separator (no blank-line gap)
    // between the progress bar and the lyric window.
    const c = new discord_js_1.ContainerBuilder();
    c.setAccentColor(containers_1.THEME_COLOR);
    c.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(`### ${titleLine(data, false)}`));
    if (duration) {
        const barLine = `> ${format_1.formatTime(position)} \`${format_1.progressBar(position, duration)}\` ${format_1.formatTime(duration)}`;
        c.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(
            player?.paused ? `${barLine} \` Song Is Paused\`` : barLine
        ));
    }
    c.addSeparatorComponents(new discord_js_1.SeparatorBuilder());
    c.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(rendered));
    return c;
}

function renderFullText(cacheKey, data, client, guildId) {
    const total = data.fullPages.length;
    const page = data.fullPages[data.fullPage];
    const headerBits = [`__${titleLine(data, false)}__`];
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
            .setLabel('SYNCED')
            .setStyle(discord_js_1.ButtonStyle.Primary));
    }
    buttons.push(new discord_js_1.ButtonBuilder()
        .setCustomId(`AuraX:lyrics_delete:${cacheKey}`)
        .setLabel('CLOSE')
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
    const linked = (0, trackTitle_1.clickableTitle)(data.meta.title, data.meta.uri);
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
    // Interpolate: Lavalink's own position reports land every few seconds, so between
    // reports we estimate forward using real elapsed wall-clock time. Without this the
    // displayed position (and the line/progress-bar it drives) only visibly changes
    // when a fresh Lavalink report arrives, even though we edit every SYNC_INTERVAL_MS.
    // While paused, Lavalink keeps re-sending the same frozen position, so the change-check
    // below never re-anchors — extrapolating against wall-clock time in that state would
    // make the position (and the lyric line) keep climbing even though nothing is playing.
    const rawPosition = player.position;
    if (rawPosition !== session.lastRawPosition) {
        session.lastRawPosition = rawPosition;
        session.positionCapturedAt = Date.now();
    }
    const estimatedPosition = player.paused
        ? session.lastRawPosition
        : session.lastRawPosition + (Date.now() - session.positionCapturedAt);
    // Always edit on every tick (not only when the active line changes) — otherwise the progress bar
    // and timestamp go stale between line changes, and edits end up landing on whatever irregular
    // gap separates two lyric lines instead of a steady 2s cadence.
    client.cache.set(session.cacheKey, data, CACHE_TTL);
    await session.message.edit((0, containers_1.cv2)(renderSynced(session.cacheKey, data, client, guildId, estimatedPosition))).catch(() => {
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
        // Lavalink only reports a fresh position every few seconds (its own internal
        // update interval) — we interpolate between those reports using real elapsed
        // time so the display advances every tick instead of jumping in ~5s steps.
        lastRawPosition: client.music?.players?.get(guildId)?.position || 0,
        positionCapturedAt: Date.now(),
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
            return reply((0, containers_1.cv2)((0, containers_1.container)(`No lyrics found for **${trackTitle_1.shortenTitle(title)}**${artist ? ` by **${artist}**` : ''}.`)));
        }

        const trackKey = `${title}::${artist}`;
        const rawFullLines = result.synced.length > 0
            ? result.synced.map(l => l.text)
            : (result.plain || 'No lyrics text available.').split('\n');
        const wrappedFullLines = rawFullLines.flatMap(line => wrapText(line, LINE_WRAP_LEN));
        const fullPages = chunkLines(wrappedFullLines, FULL_TEXT_CHUNK);

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
