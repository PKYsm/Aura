"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentHandler = void 0;
const bnameplate_1 = require("../commands/premium/bnameplate");
const gnameplate_1 = require("../commands/owner/gnameplate");
const logger_1 = require("../utils/logger");
const discord_js_1 = require("discord.js");
const checks_1 = require("../utils/checks");
const containers_1 = require("../ui/containers");
const helpMenu_1 = require("../ui/helpMenu");
const playerEmbed_1 = require("../ui/playerEmbed");
const emojis_1 = __importDefault(require("../utils/emojis"));
const botInfo_1 = __importDefault(require("../config/botInfo"));
const lyrics_2 = require("../commands/music/lyrics");
const { GuildPlayer } = require("../managers/PlayerManager");
const { clickableTitle } = require("../utils/trackTitle");
const { resolvePrefix } = require("../utils/resolvePrefix");
class ComponentHandler {
    client;
    constructor(client) {
        this.client = client;
    }
    async load() {
        return 'Component routing initialized.';
    }
    async handleButton(interaction) {
        const customPrefix = 'AuraX';
        if (!interaction.customId.startsWith(`${customPrefix}:`))
            return;
        try {
            const parts = interaction.customId.split(':');
            const action = parts[1];
            if (action === 'np' || action === 'gnp') {
                const subAction = parts[2];
                const fontId = parseInt(parts[3]);
                const effectId = parseInt(parts[4]);
                const colorId = parseInt(parts[5]);
                const callerId = parts[6];
                if (interaction.user.id !== callerId) {
                    return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.container)('Only the command author can interact with this menu.', { title: 'Nameplate Customizer', color: 'error' })));
                }
                const isGlobal = action === 'gnp';
                const buildUI = isGlobal ? gnameplate_1.buildGlobalNameplateUI : bnameplate_1.buildNameplateUI;
                const cachePrefix = isGlobal ? 'GLOBAL' : interaction.guildId;
                if (subAction === 'font_menu') {
                    const ui = await buildUI(this.client, fontId, effectId, colorId, callerId, 'font', interaction.guildId || undefined);
                    await interaction.update((0, containers_1.cv2)(ui));
                }
                else if (subAction === 'style_menu') {
                    const ui = await buildUI(this.client, fontId, effectId, colorId, callerId, 'style', interaction.guildId || undefined);
                    await interaction.update((0, containers_1.cv2)(ui));
                }
                else if (subAction === 'color_menu') {
                    const ui = await buildUI(this.client, fontId, effectId, colorId, callerId, 'color', interaction.guildId || undefined);
                    await interaction.update((0, containers_1.cv2)(ui));
                }
                else if (subAction === 'main') {
                    const ui = await buildUI(this.client, fontId, effectId, colorId, callerId, 'main', interaction.guildId || undefined);
                    await interaction.update((0, containers_1.cv2)(ui));
                }
                else if (subAction === 'save') {
                    await interaction.deferUpdate();
                    try {
                        let colors = [];
                        if (colorId === 999) {
                            const cached = this.client.nameplateCache?.get(`${cachePrefix}-${callerId}`);
                            if (cached?.decColors && cached.decColors.length > 0) {
                                colors = cached.decColors;
                            }
                            else {
                                await interaction.followUp((0, containers_1.ephemeralCV2)((0, containers_1.error)("You selected a custom color but didn't configure it. Please choose and configure a custom color first!")));
                                return;
                            }
                        }
                        else {
                            const colorInfo = bnameplate_1.COLORS[colorId] || bnameplate_1.COLORS[9];
                            colors = colorInfo.colors;
                        }
                        const effectInfo = bnameplate_1.EFFECTS[effectId] || bnameplate_1.EFFECTS[1];
                        if (effectInfo.id === 2) {
                            if (colors.length === 1) {
                                colors = [colors[0], colors[0]];
                            }
                            else if (colors.length !== 2) {
                                await interaction.followUp((0, containers_1.ephemeralCV2)((0, containers_1.error)("Gradient effect requires exactly 2 colors. Please configure a custom gradient color!")));
                                return;
                            }
                        }
                        else {
                            if (colors.length > 1) {
                                colors = [colors[0]];
                            }
                            else if (colors.length === 0) {
                                colors = [16777215];
                            }
                        }
                        if (isGlobal) {
                            const guilds = Array.from(this.client.guilds.cache.values());
                            let updatedCount = 0;
                            let skippedCount = 0;
                            for (const guild of guilds) {
                                try {
                                    const config = await this.client.db.guildConfig.findUnique({ where: { guildId: guild.id } });
                                    const isCustomized = config && !(config.nameplateFontId === 11 && config.nameplateEffectId === 1 && config.nameplateColors === "16777215");
                                    if (isCustomized) {
                                        skippedCount++;
                                        continue;
                                    }
                                    await this.client.rest.patch(`/guilds/${guild.id}/members/@me`, {
                                        body: {
                                            display_name_font_id: fontId,
                                            display_name_effect_id: effectInfo.id,
                                            display_name_colors: colors
                                        }
                                    });
                                    updatedCount++;
                                }
                                catch (e) {
                                }
                            }
                            await interaction.followUp((0, containers_1.ephemeralCV2)((0, containers_1.success)(`Global update complete!\nUpdated **${updatedCount}** servers.\nSkipped **${skippedCount}** customized servers.`)));
                        }
                        else {
                            await this.client.rest.patch(`/guilds/${interaction.guildId}/members/@me`, {
                                body: {
                                    display_name_font_id: fontId,
                                    display_name_effect_id: effectInfo.id,
                                    display_name_colors: colors
                                }
                            });
                            const colorsString = colors.join(',');
                            const hexString = colors.map((dec) => '#' + dec.toString(16).padStart(6, '0').toUpperCase()).join(',');
                            await this.client.db.guildConfig.upsert({
                                where: { guildId: interaction.guildId },
                                update: {
                                    nameplateFontId: fontId,
                                    nameplateEffectId: effectInfo.id,
                                    nameplateColors: colorsString,
                                    nameplateHex: hexString
                                },
                                create: {
                                    guildId: interaction.guildId,
                                    nameplateFontId: fontId,
                                    nameplateEffectId: effectInfo.id,
                                    nameplateColors: colorsString,
                                    nameplateHex: hexString
                                }
                            });
                            await interaction.followUp((0, containers_1.ephemeralCV2)((0, containers_1.success)("Successfully updated and saved the bot's server display style!")));
                        }
                    }
                    catch (err) {
                        await interaction.followUp((0, containers_1.ephemeralCV2)((0, containers_1.error)(`Failed to update display style: ${err.message || err}`)));
                    }
                }
                else if (subAction === 'reset') {
                    await interaction.deferUpdate();
                    try {
                        if (isGlobal) {
                            const guilds = Array.from(this.client.guilds.cache.values());
                            let updatedCount = 0;
                            let skippedCount = 0;
                            for (const guild of guilds) {
                                try {
                                    const config = await this.client.db.guildConfig.findUnique({ where: { guildId: guild.id } });
                                    const isCustomized = config && !(config.nameplateFontId === 11 && config.nameplateEffectId === 1 && config.nameplateColors === "16777215");
                                    if (isCustomized) {
                                        skippedCount++;
                                        continue;
                                    }
                                    await this.client.rest.patch(`/guilds/${guild.id}/members/@me`, {
                                        body: {
                                            display_name_font_id: null,
                                            display_name_effect_id: null,
                                            display_name_colors: null
                                        }
                                    });
                                    updatedCount++;
                                }
                                catch (e) {
                                }
                            }
                            if (this.client.nameplateCache) {
                                this.client.nameplateCache.delete(`GLOBAL-${callerId}`);
                            }
                            await interaction.followUp((0, containers_1.ephemeralCV2)((0, containers_1.success)(`Global reset complete!\nReset **${updatedCount}** servers.\nSkipped **${skippedCount}** customized servers.`)));
                        }
                        else {
                            await this.client.rest.patch(`/guilds/${interaction.guildId}/members/@me`, {
                                body: {
                                    display_name_font_id: null,
                                    display_name_effect_id: null,
                                    display_name_colors: null
                                }
                            });
                            await this.client.db.guildConfig.upsert({
                                where: { guildId: interaction.guildId },
                                update: {
                                    nameplateFontId: 11,
                                    nameplateEffectId: 1,
                                    nameplateColors: "16777215",
                                    nameplateHex: "#FFFFFF"
                                },
                                create: {
                                    guildId: interaction.guildId,
                                    nameplateFontId: 11,
                                    nameplateEffectId: 1,
                                    nameplateColors: "16777215",
                                    nameplateHex: "#FFFFFF"
                                }
                            });
                            if (this.client.nameplateCache) {
                                this.client.nameplateCache.delete(`${interaction.guildId}-${callerId}`);
                            }
                            await interaction.followUp((0, containers_1.ephemeralCV2)((0, containers_1.success)("Successfully reset the bot's server display style to default!")));
                        }
                    }
                    catch (err) {
                        await interaction.followUp((0, containers_1.ephemeralCV2)((0, containers_1.error)(`Failed to reset display style: ${err.message || err}`)));
                    }
                }
                return;
            }
            if (action === 'help_trigger' || action === 'help') {
                const callerId = parts[3] || parts[2];
                if (callerId && interaction.user.id !== callerId) {
                    await interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('Only the user who mentioned the bot can use this button.')));
                    return;
                }
                const ui = (0, helpMenu_1.buildHelpMenu)('Home', this.client, interaction.user.id);
                await interaction.update((0, containers_1.cv2)(ui));
                return;
            }
            if (action === 'lyrics_search_btn') {
                const modal = new discord_js_1.ModalBuilder()
                    .setCustomId(`AuraX:lyrics_search_modal:${interaction.guildId || interaction.channelId}`)
                    .setTitle('Search Lyrics');
                const songInput = new discord_js_1.TextInputBuilder()
                    .setCustomId('song_query')
                    .setLabel('Song name (and artist, if you know it)')
                    .setPlaceholder('e.g. Blinding Lights The Weeknd')
                    .setStyle(discord_js_1.TextInputStyle.Short)
                    .setRequired(true);
                modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(songInput));
                return interaction.showModal(modal);
            }
            if (action === 'lyrics_pick_sync' || action === 'lyrics_pick_full') {
                const cacheKey = parts[2];
                const wantMode = action === 'lyrics_pick_sync' ? 'sync' : 'full';
                const result = (0, lyrics_2.switchMode)(cacheKey, wantMode, this.client, interaction.guildId);
                if (result.expired) {
                    await interaction.reply((0, containers_1.ephemeralCV2)(result.container));
                    return;
                }
                await interaction.update((0, containers_1.cv2)(result.container));
                const sent = await interaction.fetchReply().catch(() => null);
                (0, lyrics_2.attachLiveMessage)(cacheKey, this.client, sent);
                return;
            }
            if (action === 'lyrics_sync') {
                const cacheKey = parts[2];
                const result = (0, lyrics_2.switchMode)(cacheKey, 'sync', this.client, interaction.guildId);
                if (result.expired) {
                    await interaction.reply((0, containers_1.ephemeralCV2)(result.container));
                    return;
                }
                await interaction.update((0, containers_1.cv2)(result.container));
                const sent = await interaction.fetchReply().catch(() => null);
                (0, lyrics_2.attachLiveMessage)(cacheKey, this.client, sent);
                return;
            }
            if (action === 'lyrics_prev_page' || action === 'lyrics_next_page') {
                const cacheKey = parts[2];
                const cached = this.client.cache.get(cacheKey);
                if (!cached) {
                    await interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.container)('This lyrics session expired. Run `/lyrics` again.')));
                    return;
                }
                const nextPage = cached.fullPage + (action === 'lyrics_next_page' ? 1 : -1);
                const view = (0, lyrics_2.buildFullTextView)(cacheKey, nextPage, this.client);
                if (view.expired) {
                    await interaction.reply((0, containers_1.ephemeralCV2)(view.container));
                    return;
                }
                await interaction.update((0, containers_1.cv2)(view.container));
                return;
            }
            if (action === 'lyrics_delete') {
                const cacheKey = parts[2];
                const cached = this.client.cache.get(cacheKey);
                const guildId = cached?.meta?.guildId || interaction.guildId;
                (0, lyrics_2.deleteLyricsSession)(cacheKey, this.client, guildId);
                await interaction.deferUpdate().catch(() => { });
                await interaction.message.delete().catch(() => { });
                return;
            }
            const musicActions = ['pause', 'skip', 'prev', 'rewind', 'forward', 'stop', 'loop', 'shuffle', 'autoplay', 'heart'];
            if (musicActions.includes(action) && !(0, checks_1.inSameVoiceChannel)(interaction)) {
                await interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('You must be in the same voice channel as me to use this.')));
                return;
            }
            const guildPlayer = this.client.guildPlayers.get(interaction.guildId);
            if (musicActions.includes(action) && !guildPlayer) {
                await interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('No music is currently playing in this server.')));
                return;
            }
            // ── Check BEFORE deferring so we can still reply() with an ephemeral error ──
            // Silently returning after deferUpdate() leaves the interaction in a broken
            // "thinking" state and gives the user zero feedback.
            if (guildPlayer && !guildPlayer.player.queue.current) {
                if (musicActions.includes(action)) {
                    await interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('No track is currently playing.')));
                    return;
                }
            }
            await interaction.deferUpdate().catch(() => { });
            // Toast message shown to the button-presser only (ephemeral followUp)
            let toastText = null;
            switch (action) {
                case 'pause':
                    guildPlayer.player.pause(!guildPlayer.player.paused);
                    toastText = guildPlayer.player.paused
                        ? `${emojis_1.default.music.pause} **Paused** by ${interaction.user}`
                        : `${emojis_1.default.music.play} **Resumed** by ${interaction.user}`;
                    break;
                case 'skip':
                    try {
                        if (guildPlayer.player)
                            guildPlayer.player.skip();
                        await (0, lyrics_2.endLyricsSessions)(this.client, interaction.guildId, 'Track skipped — synced lyrics session closed.');
                        toastText = `${emojis_1.default.music.next} **Skipped** by ${interaction.user}`;
                    }
                    catch (e) { }
                    break;
                case 'prev': {
                    const previous = guildPlayer.player.getPrevious();
                    if (previous) {
                        guildPlayer.player.play(previous);
                        await (0, lyrics_2.endLyricsSessions)(this.client, interaction.guildId, 'Previous track — synced lyrics session closed.');
                        toastText = `${emojis_1.default.music.prev} **Previous track** by ${interaction.user}`;
                    }
                    else {
                        await interaction.followUp((0, containers_1.ephemeralCV2)((0, containers_1.error)('No previous track found.')));
                        return;
                    }
                    break;
                }
                case 'rewind':
                    guildPlayer.player.seek(Math.max(0, guildPlayer.player.position - 10000));
                    toastText = `${emojis_1.default.music.back} **Rewound 10s** by ${interaction.user}`;
                    break;
                case 'forward':
                    guildPlayer.player.seek(guildPlayer.player.position + 10000);
                    toastText = `${emojis_1.default.music.forward} **Fast-forwarded 10s** by ${interaction.user}`;
                    break;
                case 'stop': {
                    guildPlayer.isStopped = true;
                    const is247 = await this.client.db.vc247.findUnique({ where: { guildId: interaction.guildId } });
                    if (is247) {
                        guildPlayer.player.queue.clear();
                        guildPlayer.player.shoukaku.stopTrack();
                        await (0, lyrics_2.endLyricsSessions)(this.client, interaction.guildId, 'Playback stopped — synced lyrics session closed.');
                        await interaction.followUp((0, containers_1.ephemeralCV2)((0, containers_1.success)(`${emojis_1.default.music.stop} Stopped and cleared queue. (24/7 active — bot stays in VC)`))).catch(() => { });
                    }
                    else {
                        guildPlayer.player.destroy();
                        this.client.guildPlayers.delete(interaction.guildId);
                        await (0, lyrics_2.endLyricsSessions)(this.client, interaction.guildId, 'Bot left the voice channel — synced lyrics session closed.');
                        await interaction.followUp((0, containers_1.ephemeralCV2)((0, containers_1.success)(`${emojis_1.default.music.stop} **Stopped** by ${interaction.user} — bot left the channel.`))).catch(() => { });
                    }
                    return;
                }
                case 'loop': {
                    let nextLoop = 'none';
                    if (guildPlayer.player.loop === 'none')
                        nextLoop = 'track';
                    else if (guildPlayer.player.loop === 'track')
                        nextLoop = 'queue';
                    else
                        nextLoop = 'none';
                    guildPlayer.player.setLoop(nextLoop);
                    const loopLabel = nextLoop === 'none' ? 'Off' : nextLoop === 'track' ? 'Track' : 'Queue';
                    toastText = `${emojis_1.default.music.loop} **Loop: ${loopLabel}** — set by ${interaction.user}`;
                    break;
                }
                case 'shuffle':
                    guildPlayer.player.queue.shuffle();
                    toastText = `${emojis_1.default.music.shuffle} **Queue shuffled** by ${interaction.user}`;
                    break;
                case 'autoplay':
                    guildPlayer.autoplay = !guildPlayer.autoplay;
                    toastText = `${emojis_1.default.music.autoplay} **Autoplay: ${guildPlayer.autoplay ? 'On' : 'Off'}** — set by ${interaction.user}`;
                    break;
                case 'heart': {
                    const track = guildPlayer?.player.queue.current;
                    if (track) {
                        try {
                            const existing = await this.client.db.likedTrack.findFirst({
                                where: { userId: interaction.user.id, uri: track.uri }
                            });
                            if (!existing) {
                                await this.client.db.likedTrack.create({
                                    data: {
                                        userId: interaction.user.id,
                                        title: track.title,
                                        uri: track.uri,
                                        author: track.author || 'Unknown',
                                        duration: track.length || 0,
                                        source: track.sourceName || 'unknown'
                                    }
                                });
                            }
                        }
                        catch (e) {
                            console.error(e);
                        }
                    }
                    await interaction.followUp((0, containers_1.ephemeralCV2)((0, containers_1.success)(`Added to your liked songs! ${emojis_1.default.music.like}`)));
                    return;
                }
                default:
                    break;
            }
            // Send ephemeral toast so the user knows their action was received
            if (toastText) {
                await interaction.followUp((0, containers_1.ephemeralCV2)((0, containers_1.success)(toastText))).catch(() => { });
            }
            // Refresh the NowPlaying panel to reflect the new state (pause/loop/autoplay etc.)
            if (guildPlayer && guildPlayer.player.queue.current) {
                const loopMode = guildPlayer.player.loop === 'none' ? 0 : guildPlayer.player.loop === 'track' ? 1 : 2;
                const ui = (0, playerEmbed_1.buildPlayerUI)(guildPlayer.player.guildId, guildPlayer.player.queue.current, guildPlayer.player.position, guildPlayer.player.playing, loopMode, guildPlayer.player.queue.length, guildPlayer.player.volume, guildPlayer.autoplay);
                if (guildPlayer.playerMessageId) {
                    const channel = this.client.channels.cache.get(guildPlayer.textChannelId || guildPlayer.player.textId);
                    if (channel) {
                        const msg = await channel.messages.fetch(guildPlayer.playerMessageId).catch(() => null);
                        if (msg) {
                            const currentUI = (0, containers_1.cv2)(ui);
                            await msg.edit(currentUI).catch(() => null);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error(error);
        }
    }
    async handleSelectMenu(interaction) {
        const customPrefix = 'AuraX';
        if (!interaction.customId.startsWith(`${customPrefix}:`))
            return;
        try {
            const parts = interaction.customId.split(':');
            const action = parts[1];
            if (action === 'filter_select' || action === 'filterSet') {
                if (!(0, checks_1.inSameVoiceChannel)(interaction)) {
                    await interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('You must be in the same voice channel as me to use this.')));
                    return;
                }
                const guildPlayer = this.client.guildPlayers.get(interaction.guildId);
                if (!guildPlayer) {
                    await interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('No music player is currently active in this server.')));
                    return;
                }
                const filter = interaction.values[0];
                guildPlayer.filters.applyPreset(filter);
                await interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.success)(`Filter \`${filter}\` applied.`)));
                return;
            }
            if (action === 'help_select') {
                const callerId = parts[2];
                if (callerId && interaction.user.id !== callerId) {
                    await interaction.reply({ content: 'You cannot use this dropdown.', ephemeral: true });
                    return;
                }
                const category = interaction.values[0];
                const ui = (0, helpMenu_1.buildHelpMenu)(category, this.client, callerId);
                await interaction.update((0, containers_1.cv2)(ui));
                return;
            }
            if (action === 'engine_select') {
                const callerId = parts[2];
                if (callerId && interaction.user.id !== callerId) {
                    await interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('You cannot use this dropdown.')));
                    return;
                }
                const selectedEngine = interaction.values[0];
                await this.client.db.userConfig.upsert({
                    where: { userId: callerId },
                    update: { searchEngine: selectedEngine },
                    create: { userId: callerId, searchEngine: selectedEngine }
                });
                const engines = {
                    'ytsearch': 'YouTube',
                    'spsearch': 'Spotify',
                    'scsearch': 'SoundCloud',
                    'dzsearch': 'Deezer',
                    'jssearch': 'JioSaavn'
                };
                const engineName = engines[selectedEngine] || selectedEngine;
                await interaction.update((0, containers_1.cv2)((0, containers_1.success)(`Your default search engine is now set to **${engineName}**.`)));
                return;
            }
            if (action === 'np_duration') {
                const targetUserId = parts[2];
                const days = parseInt(interaction.values[0]);
                let expiresAt = null;
                if (days > 0) {
                    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
                }
                await this.client.db.noPrefixUser.upsert({
                    where: { userId: targetUserId },
                    update: { expiresAt },
                    create: { userId: targetUserId, expiresAt }
                });
                const timeStr = expiresAt ? `until <t:${Math.floor(expiresAt.getTime() / 1000)}:f>` : 'Lifetime';
                try {
                    const targetUser = await this.client.users.fetch(targetUserId);
                    logger_1.Logger.logNP('Added/Updated', targetUser, `Granted No-Prefix access ${timeStr}`);
                }
                catch { }
                await interaction.update((0, containers_1.cv2)((0, containers_1.container)(`Successfully granted No-Prefix access to <@${targetUserId}> (${timeStr}).`, { title: 'Aura Owner', color: 'success' })));
                return;
            }
            if (action === 'premium_duration') {
                const targetUserId = parts[2];
                const days = parseInt(interaction.values[0]);
                let expiresAt = null;
                if (days > 0) {
                    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
                }
                await this.client.db.premiumUser.upsert({
                    where: { userId: targetUserId },
                    update: { expiresAt },
                    create: { userId: targetUserId, expiresAt }
                });
                const timeStr = expiresAt ? `until <t:${Math.floor(expiresAt.getTime() / 1000)}:f>` : 'Lifetime';
                try {
                    const targetUser = await this.client.users.fetch(targetUserId);
                    logger_1.Logger.logPremium('Added/Updated', targetUser, `Granted Premium access ${timeStr}`);
                }
                catch { }
                await interaction.update((0, containers_1.cv2)((0, containers_1.container)(`Successfully granted Premium access to <@${targetUserId}> (${timeStr}).`, { title: 'Aura Premium', color: 'success' })));
                return;
            }
            if (action === 'search_select') {
                // searchId format: search_{userId}_{timestamp}
                const searchId = parts[2];
                const originalUserId = searchId?.split('_')[1];

                // Only the user who triggered the search can select a track
                if (originalUserId && interaction.user.id !== originalUserId) {
                    await interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('Only the person who searched can select a track.')));
                    return;
                }

                // Retrieve tracks from RAM cache
                const tracks = this.client.cache.get(searchId);
                if (!tracks || !tracks.length) {
                    await interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('Search results have expired. Please run the search again.')));
                    return;
                }

                // Defer NOW — player creation (Lavalink connect) can be slow and will
                // exceed Discord's 3-second acknowledgement window without this.
                await interaction.deferUpdate().catch(() => { });

                const selectedIdx = parseInt(interaction.values[0]);
                const selectedTrack = tracks[selectedIdx];
                if (!selectedTrack) {
                    await interaction.followUp((0, containers_1.ephemeralCV2)((0, containers_1.error)('Invalid selection. Please try searching again.')));
                    return;
                }

                // Voice channel check
                const member = interaction.member;
                const voiceChannel = member?.voice?.channel;
                if (!voiceChannel) {
                    await interaction.followUp((0, containers_1.ephemeralCV2)((0, containers_1.error)('You need to be in a voice channel to play music!')));
                    return;
                }

                // Get or re-create the player
                let player = this.client.music.players.get(interaction.guildId);
                if (!player) {
                    player = await this.client.music.createPlayer({
                        guildId: interaction.guildId,
                        textId: interaction.channelId,
                        voiceId: voiceChannel.id,
                        volume: 100,
                    });
                }

                let guildPlayer = this.client.guildPlayers.get(interaction.guildId);
                if (!guildPlayer) {
                    guildPlayer = new GuildPlayer(player);
                    this.client.guildPlayers.set(interaction.guildId, guildPlayer);
                }
                guildPlayer.textChannelId = interaction.channelId;
                guildPlayer.isStopped = false;

                // Add the selected track to queue
                player.queue.add(selectedTrack);
                const position = player.queue.length;

                // Invalidate the cache — one-time use only
                this.client.cache.del(searchId);

                const prefix = await resolvePrefix(this.client, interaction.guildId, interaction.user.id);
                const c = (0, containers_1.containerWithDivider)([
                    `**Added to queue** \`#${position}\`\n${clickableTitle(selectedTrack.title || selectedTrack.info?.title, selectedTrack.uri || selectedTrack.info?.uri, Infinity)}`,
                    `-# Not the right track? Use \`${prefix}search\` or change the search engine with \`${prefix}engine\``
                ]);
                // editReply since we already deferUpdate()'d above
                await interaction.editReply((0, containers_1.cv2)(c));

                // Start playback only if nothing is currently playing/paused
                if (!player.playing && !player.paused) {
                    player.play();
                }
                return;
            }
            if (action === 'np' || action === 'gnp') {
                const subAction = parts[2];
                const fontId = parseInt(parts[3]);
                const effectId = parseInt(parts[4]);
                const colorId = parseInt(parts[5]);
                const callerId = parts[6];
                if (interaction.user.id !== callerId) {
                    return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.container)('Only the command author can interact with this menu.', { title: 'Nameplate Customizer', color: 'error' })));
                }
                const isGlobal = action === 'gnp';
                const buildUI = isGlobal ? gnameplate_1.buildGlobalNameplateUI : bnameplate_1.buildNameplateUI;
                const cachePrefix = isGlobal ? 'GLOBAL' : interaction.guildId;
                if (subAction === 'set_font') {
                    const value = parseInt(interaction.values[0]);
                    const ui = await buildUI(this.client, value, effectId, colorId, callerId, 'main', interaction.guildId || undefined);
                    await interaction.update((0, containers_1.cv2)(ui));
                }
                else if (subAction === 'set_style') {
                    const value = parseInt(interaction.values[0]);
                    if (value !== 2) {
                        const cached = this.client.nameplateCache?.get(`${cachePrefix}-${callerId}`);
                        if (cached) {
                            if (cached.hexColors && cached.hexColors.length > 1) {
                                cached.hexColors = [cached.hexColors[0]];
                            }
                            if (cached.decColors && cached.decColors.length > 1) {
                                cached.decColors = [cached.decColors[0]];
                            }
                        }
                    }
                    const ui = await buildUI(this.client, fontId, value, colorId, callerId, 'main', interaction.guildId || undefined);
                    await interaction.update((0, containers_1.cv2)(ui));
                }
                else if (subAction === 'set_color') {
                    if (interaction.values[0] === 'custom') {
                        const modal = new discord_js_1.ModalBuilder()
                            .setCustomId(`${customPrefix}:np:modal_submit:${fontId}:${effectId}:999:${callerId}`)
                            .setTitle('Custom Color (Hex Code)');
                        const textInput1 = new discord_js_1.TextInputBuilder()
                            .setCustomId('hex_color_1')
                            .setLabel(effectId === 2 ? 'First Hex Color (e.g. #FF0000)' : 'Hex Color (e.g. #FF0000)')
                            .setPlaceholder('#FF0000')
                            .setStyle(discord_js_1.TextInputStyle.Short)
                            .setRequired(true);
                        const rows = [new discord_js_1.ActionRowBuilder().addComponents(textInput1)];
                        if (effectId === 2) {
                            const textInput2 = new discord_js_1.TextInputBuilder()
                                .setCustomId('hex_color_2')
                                .setLabel('Second Hex Color (e.g. #00FF00)')
                                .setPlaceholder('#00FF00')
                                .setStyle(discord_js_1.TextInputStyle.Short)
                                .setRequired(true);
                            rows.push(new discord_js_1.ActionRowBuilder().addComponents(textInput2));
                        }
                        modal.addComponents(...rows);
                        return interaction.showModal(modal);
                    }
                    else {
                        const value = parseInt(interaction.values[0]);
                        const ui = await buildUI(this.client, fontId, effectId, value, callerId, 'main', interaction.guildId || undefined);
                        await interaction.update((0, containers_1.cv2)(ui));
                    }
                }
                else if (subAction === 'set_color_grad1' || subAction === 'set_color_grad2') {
                    if (interaction.values[0] === 'custom') {
                        const modal = new discord_js_1.ModalBuilder()
                            .setCustomId(`${customPrefix}:np:modal_submit:${fontId}:${effectId}:999:${callerId}`)
                            .setTitle('Custom Color (Hex Code)');
                        const textInput1 = new discord_js_1.TextInputBuilder()
                            .setCustomId('hex_color_1')
                            .setLabel('First Hex Color (e.g. #FF0000)')
                            .setPlaceholder('#FF0000')
                            .setStyle(discord_js_1.TextInputStyle.Short)
                            .setRequired(true);
                        const rows = [new discord_js_1.ActionRowBuilder().addComponents(textInput1)];
                        if (effectId === 2) {
                            const textInput2 = new discord_js_1.TextInputBuilder()
                                .setCustomId('hex_color_2')
                                .setLabel('Second Hex Color (e.g. #00FF00)')
                                .setPlaceholder('#00FF00')
                                .setStyle(discord_js_1.TextInputStyle.Short)
                                .setRequired(true);
                            rows.push(new discord_js_1.ActionRowBuilder().addComponents(textInput2));
                        }
                        modal.addComponents(...rows);
                        return interaction.showModal(modal);
                    }
                    else {
                        const predefinedId = parseInt(interaction.values[0]);
                        const selectedColors = bnameplate_1.COLORS[predefinedId]?.colors || [16777215];
                        const selectedDec = selectedColors[0];
                        const selectedHex = '#' + selectedDec.toString(16).padStart(6, '0').toUpperCase();
                        if (!this.client.nameplateCache) {
                            this.client.nameplateCache = new Map();
                        }
                        let cached = this.client.nameplateCache.get(`${cachePrefix}-${callerId}`);
                        if (!cached) {
                            cached = {
                                hexColors: ['#FFFFFF', '#FFFFFF'],
                                decColors: [16777215, 16777215]
                            };
                        }
                        if (subAction === 'set_color_grad1') {
                            cached.decColors[0] = selectedDec;
                            cached.hexColors[0] = selectedHex;
                        }
                        else {
                            cached.decColors[1] = selectedDec;
                            cached.hexColors[1] = selectedHex;
                        }
                        this.client.nameplateCache.set(`${cachePrefix}-${callerId}`, cached);
                        const ui = await buildUI(this.client, fontId, effectId, 999, callerId, 'color', interaction.guildId || undefined);
                        await interaction.update((0, containers_1.cv2)(ui));
                    }
                }
                return;
            }
            if (action === 'stats_select') {
                const callerId = parts[2];
                if (callerId && interaction.user.id !== callerId) {
                    await interaction.reply({ content: 'You cannot use this dropdown.', ephemeral: true });
                    return;
                }
                const choice = interaction.values[0];
                let content = '';
                let title = '';
                const dot = emojis_1.default.general.dot;
                const footer = `Aura • Made By Aura Devs`;
                if (choice === 'general') {
                    title = `${emojis_1.default.general.stats} General Statistics`;
                    const uptime = process.uptime();
                    const d = Math.floor(uptime / (3600 * 24));
                    const h = Math.floor((uptime % (3600 * 24)) / 3600);
                    const m = Math.floor((uptime % 3600) / 60);
                    const uptimeStr = `${d > 0 ? `${d}d ` : ''}${h > 0 ? `${h}h ` : ''}${m}m`;
                    content = `${dot} **Total Guilds:** \`${this.client.guilds.cache.size}\`\n` +
                        `${dot} **Total Users:** \`${this.client.guilds.cache.reduce((a, b) => a + b.memberCount, 0)}\`\n` +
                        `${dot} **Shard ID:** \`#${interaction.guild?.shardId ?? 0}\`\n` +
                        `${dot} **Uptime:** \`${uptimeStr}\`\n` +
                        `${dot} **Gateway Ping:** \`${this.client.ws.ping}ms\``;
                }
                else if (choice === 'system') {
                    title = `${emojis_1.default.general.system} System Statistics`;
                    const mem = process.memoryUsage();
                    content = `${dot} **Node.js Version:** \`${process.version}\`\n` +
                        `${dot} **Operating System:** \`Windows 11\`\n` +
                        `${dot} **Memory Usage:** \`${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB / ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB\`\n` +
                        `${dot} **CPU Arch:** \`${process.arch}\``;
                }
                else if (choice === 'team') {
                    title = `${emojis_1.default.general.team} Development Team`;
                    content = `${dot} **Lead Developer:** \`${botInfo_1.default.developer.name}\`\n` +
                        `${dot} **Contact:** \`${botInfo_1.default.developer.email}\`\n` +
                        `${dot} **GitHub:** [${botInfo_1.default.developer.github.replace('https://github.com/', '@')}](${botInfo_1.default.developer.github})\n` +
                        `${dot} **Support Server:** [Click Here](${botInfo_1.default.links.supportServer})`;
                }
                else if (choice === 'ping') {
                    title = `${emojis_1.default.general.ping} Latency Statistics`;
                    content = `${dot} **Gateway Ping:** \`${this.client.ws.ping}ms\``; // simplified
                }
                else if (choice === 'music') {
                    title = `${emojis_1.default.general.music} Music Node Statistics`;
                    const node = Array.from(this.client.music.shoukaku.nodes.values())[0];
                    const state = node ? (node.state === 1 ? 'Connected' : 'Disconnected') : 'No Node Available';
                    const players = node?.stats?.players || 0;
                    content = `${dot} **Node Name:** \`${node ? node.name : 'Unknown'}\`\n` +
                        `${dot} **Node State:** \`${state}\`\n` +
                        `${dot} **Active Players:** \`${players}\``;
                }
                const botName = this.client.user?.username || 'Bot';
                const statsUI = new discord_js_1.ContainerBuilder()
                    .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(`# ${title}\n\n${content}\n\n-# ${botName} • Made By Aura Devs`));
                const select = new discord_js_1.StringSelectMenuBuilder()
                    .setCustomId(`${customPrefix}:stats_select:${callerId}`)
                    .setPlaceholder('Select statistic category...')
                    .addOptions([
                    { label: "General Stats", description: "Servers, Users, Shards", emoji: emojis_1.default.general.stats, value: "general" },
                    { label: "Team Info", description: "Owner and Developer info", emoji: emojis_1.default.general.team, value: "team" },
                    { label: "System Info", description: "DB, RAM, CPU", emoji: emojis_1.default.general.system, value: "system" },
                    { label: "Ping", description: "Database & Websocket Latency", emoji: emojis_1.default.general.ping, value: "ping" },
                    { label: "Music Node", description: "Lavalink Node status", emoji: emojis_1.default.general.music, value: "music" }
                ]);
                statsUI.addActionRowComponents(new discord_js_1.ActionRowBuilder().addComponents(select));
                await interaction.update((0, containers_1.cv2)(statsUI));
                return;
            }
        }
        catch (error) {
            console.error(error);
        }
    }
    async handleModalSubmit(interaction) {
        const customPrefix = 'AuraX';
        if (!interaction.customId.startsWith(`${customPrefix}:`))
            return;
        try {
            const parts = interaction.customId.split(':');
            const action = parts[1];
            if (action === 'lyrics_search_modal') {
                const query = interaction.fields.getTextInputValue('song_query').trim();
                await interaction.deferReply();
                await lyrics_2.default.handleAction(this.client, interaction, query);
                return;
            }
            if (action === 'np' || action === 'gnp') {
                const subAction = parts[2];
                const fontId = parseInt(parts[3]);
                const effectId = parseInt(parts[4]);
                const colorId = parseInt(parts[5]);
                const callerId = parts[6];
                if (interaction.user.id !== callerId) {
                    return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.container)('Only the command author can interact with this menu.', { title: 'Nameplate Customizer', color: 'error' })));
                }
                const isGlobal = action === 'gnp';
                const buildUI = isGlobal ? gnameplate_1.buildGlobalNameplateUI : bnameplate_1.buildNameplateUI;
                const cachePrefix = isGlobal ? 'GLOBAL' : interaction.guildId;
                if (subAction === 'modal_submit') {
                    const val1 = interaction.fields.getTextInputValue('hex_color_1').trim();
                    let val2 = '';
                    try {
                        val2 = interaction.fields.getTextInputValue('hex_color_2').trim();
                    }
                    catch { }
                    const parseHex = (hex) => {
                        const cleaned = hex.replace(/^#/, '');
                        if (!/^[0-9A-Fa-f]{6}$/.test(cleaned))
                            return null;
                        return parseInt(cleaned, 16);
                    };
                    const dec1 = parseHex(val1);
                    const dec2 = val2 ? parseHex(val2) : null;
                    if (dec1 === null || (effectId === 2 && dec2 === null)) {
                        return interaction.reply({
                            content: 'Invalid hex color code(s) entered. Please use standard 6-character hex codes (e.g., #FF0000).',
                            ephemeral: true
                        });
                    }
                    if (!this.client.nameplateCache) {
                        this.client.nameplateCache = new Map();
                    }
                    const hexColors = [val1];
                    const decColors = [dec1];
                    if (effectId === 2 && val2 && dec2 !== null) {
                        hexColors.push(val2);
                        decColors.push(dec2);
                    }
                    this.client.nameplateCache.set(`${cachePrefix}-${callerId}`, { hexColors, decColors });
                    const ui = await buildUI(this.client, fontId, effectId, 999, callerId, 'main', interaction.guildId || undefined);
                    if (interaction.update) {
                        await interaction.update((0, containers_1.cv2)(ui));
                    }
                    else {
                        await interaction.reply((0, containers_1.cv2)(ui));
                    }
                }
            }
        }
        catch (err) {
            console.error(err);
        }
    }
}
exports.ComponentHandler = ComponentHandler;
