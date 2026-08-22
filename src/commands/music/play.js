"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const PlayerManager_1 = require("../../managers/PlayerManager");
const kazagumo_1 = require("kazagumo");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a song or playlist')
        .addStringOption(o => o.setName('query').setDescription('The song title or URL').setRequired(true)),
    aliases: ['p'],
    category: 'music',
    async execute(interaction, client) {
        const query = interaction.options.getString('query', true);
        if (!query) {
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('Please provide a query or URL!')));
        }
        const member = interaction.member;
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('You need to be in a voice channel to play music!')));
        }
        let player = client.music.players.get(interaction.guildId);
        if (!player) {
            player = await client.music.createPlayer({
                guildId: interaction.guildId,
                textId: interaction.channelId,
                voiceId: voiceChannel.id,
                volume: 100,
            });
        }
        let guildPlayer = client.guildPlayers.get(interaction.guildId);
        if (!guildPlayer) {
            guildPlayer = new PlayerManager_1.GuildPlayer(player);
            client.guildPlayers.set(interaction.guildId, guildPlayer);
        }
        guildPlayer.textChannelId = interaction.channelId;
        guildPlayer.isStopped = false;
        const userConfig = await client.db.userConfig.findUnique({ where: { userId: interaction.user.id } });
        const dbEngine = userConfig?.searchEngine || 'spsearch';
        const engineMap = {
            'ytsearch': 'ytsearch',
            'scsearch': 'scsearch',
            'spsearch': 'spsearch',
            'dzsearch': 'dzsearch',
            'jssearch': 'jssearch'
        };
        const primaryEngine = engineMap[dbEngine] || 'spsearch';
        const fallbackOrder = ['spsearch', 'dzsearch', 'youtube_music'];
        const enginesToTry = [primaryEngine, ...fallbackOrder.filter(e => e !== primaryEngine)];
        // --- SHOUKAKU DIRECT FETCH LOGIC (BYPASS KAZAGUMO WRAPPER) ---
        const node = client.music.shoukaku.getIdealNode();
        if (!node) {
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('Music servers are currently unavailable.')));
        }
        let resData = null;
        let kazaTracks = [];
        const isUrl = /^https?:\/\//.test(query);
        for (const engine of enginesToTry) {
            try {
                const searchQuery = isUrl ? query : `${engine}:${query}`;
                // Directly query Lavalink via Shoukaku's REST to prevent engine tampering
                const attempt = await node.rest.resolve(searchQuery);
                if (attempt && ['search', 'track', 'playlist'].includes(attempt.loadType)) {
                    resData = attempt;
                    let rawTracks = [];
                    if (attempt.loadType === 'playlist')
                        rawTracks = attempt.data.tracks;
                    else if (attempt.loadType === 'search')
                        rawTracks = attempt.data;
                    else if (attempt.loadType === 'track')
                        rawTracks = [attempt.data];
                    if (rawTracks.length > 0) {
                        // Convert raw Lavalink tracks to Kazagumo tracks manually
                        kazaTracks = rawTracks.map((t) => new kazagumo_1.KazagumoTrack(t, interaction.user));
                        break;
                    }
                }
            }
            catch (e) {
                continue;
            }
            if (isUrl)
                break;
        }
        if (!kazaTracks.length) {
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('No results found.')));
        }
        if (resData.loadType === 'playlist') {
            for (const track of kazaTracks)
                player.queue.add(track);
            await interaction.reply((0, containers_1.cv2)((0, containers_1.success)(`Added ${kazaTracks.length} tracks from playlist **${resData.data?.info?.name || 'Unknown'}** to the queue.`)));
        }
        else {
            player.queue.add(kazaTracks[0]);
            await interaction.reply((0, containers_1.cv2)((0, containers_1.success)(`Added **${kazaTracks[0].title}** to the queue.`)));
        }
        if (!player.playing && !player.paused) {
            player.play();
        }
        else {
            await guildPlayer.resendPanel(client);
        }
    }
};
