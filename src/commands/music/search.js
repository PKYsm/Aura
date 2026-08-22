"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const PlayerManager_1 = require("../../managers/PlayerManager");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('search')
        .setDescription('Search for a track and select it from a dropdown.')
        .addStringOption(o => o.setName('query').setDescription('What do you want to search for?').setRequired(true)),
    category: 'music',
    aliases: ['find', 'sr'],
    async execute(interaction, client) {
        const query = interaction.options.getString('query', true);
        if (!query) {
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('Please provide a query!')));
        }
        const member = interaction.member;
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('You need to be in a voice channel to search music!')));
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
            'ytsearch': 'youtube',
            'scsearch': 'soundcloud',
            'spsearch': 'spotify',
            'dzsearch': 'deezer',
            'jssearch': 'jiosaavn'
        };
        const engine = engineMap[dbEngine] || 'youtube';
        const res = await client.music.search(query, { requester: interaction.user, engine });
        if (!res.tracks.length) {
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('No results found for that query.')));
        }
        const tracks = res.tracks.slice(0, 10);
        const searchId = `search_${interaction.user.id}_${Date.now()}`;
        client.cache.set(searchId, tracks);
        const select = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId(`AuraX:search_select:${searchId}`)
            .setPlaceholder('Select a track to play...');
        tracks.forEach((t, idx) => {
            select.addOptions({
                label: t.title.substring(0, 95),
                description: t.author ? t.author.substring(0, 95) : 'Unknown Artist',
                value: idx.toString()
            });
        });
        const row = new discord_js_1.ActionRowBuilder().addComponents(select);
        const c = (0, containers_1.container)(`Found **${tracks.length}** results for \`${query}\`.\nChoose the track you want to play from the dropdown below!`, { title: 'Search Results' });
        c.addActionRowComponents(row);
        await interaction.reply((0, containers_1.cv2)(c));
    }
};
