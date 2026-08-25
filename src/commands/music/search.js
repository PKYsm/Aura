"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const PlayerManager_1 = require("../../managers/PlayerManager");

// KazagumoTrack is needed to wrap raw Lavalink tracks into objects that
// player.queue.add() understands — same approach as play.js.
let KazagumoTrack;
try { KazagumoTrack = require('kazagumo').KazagumoTrack; } catch { }

exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('search')
        .setDescription('Search for a track and select it from a dropdown.')
        .addStringOption(o => o.setName('query').setDescription('What do you want to search for?').setRequired(true)),
    category: 'music',
    aliases: ['find', 'sr'],
    async execute(interaction, client) {
        const query = interaction.options.getString('query', true)?.trim();
        if (!query) return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('Please provide a query!')));

        const member = interaction.member;
        const voiceChannel = member?.voice?.channel;
        if (!voiceChannel) {
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('You need to be in a voice channel to search music!')));
        }

        // Defer so slow Lavalink lookups don't timeout the interaction
        await interaction.deferReply();

        // ── Use node.rest.resolve() directly, same as play.js ──────────────
        const node = client.music.shoukaku.getIdealNode();
        if (!node) {
            return interaction.editReply((0, containers_1.ephemeralCV2)((0, containers_1.error)('Music servers are currently unavailable. Please try again later.')));
        }
        const userConfig = await client.db.userConfig.findUnique({ where: { userId: interaction.user.id } });
        const engine = userConfig?.searchEngine || 'spsearch'; // e.g. 'spsearch', 'ytsearch'
        const searchQuery = `${engine}:${query}`;
        const res = await node.rest.resolve(searchQuery).catch(() => null);

        if (!res || !['search', 'track', 'playlist'].includes(res.loadType) || !res.data) {
            return interaction.editReply((0, containers_1.ephemeralCV2)((0, containers_1.error)('No results found for that query.')));
        }

        // Normalise to an array of raw Lavalink track data
        const rawTracks = (res.loadType === 'search' || res.loadType === 'playlist')
            ? (Array.isArray(res.data) ? res.data : res.data?.tracks ?? [])
            : [res.data];

        const top10 = rawTracks.slice(0, 10);
        if (!top10.length) {
            return interaction.editReply((0, containers_1.ephemeralCV2)((0, containers_1.error)('No results found for that query.')));
        }

        // Wrap raw Lavalink tracks into KazagumoTrack objects so queue.add() works
        let kazagumoTracks;
        if (KazagumoTrack) {
            kazagumoTracks = top10.map(t => new KazagumoTrack(t, interaction.user));
        } else {
            // Fallback: attach requester directly on the raw track object
            kazagumoTracks = top10.map(t => ({ ...t, requester: interaction.user }));
        }

        // Cache the track list — ComponentHandler picks it up on select
        const searchId = `search_${interaction.user.id}_${Date.now()}`;
        client.cache.set(searchId, kazagumoTracks, 120); // 2-minute window to pick

        // Build the select menu
        const select = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId(`AuraX:search_select:${searchId}`)
            .setPlaceholder('Select a track to play...');

        top10.forEach((t, idx) => {
            const title  = (t.info?.title  || t.title  || 'Unknown Track').substring(0, 95);
            const author = (t.info?.author || t.author || 'Unknown Artist').substring(0, 95);
            select.addOptions({ label: title, description: author, value: idx.toString() });
        });

        const row = new discord_js_1.ActionRowBuilder().addComponents(select);
        const c = (0, containers_1.container)(
            `Found **${top10.length}** results for \`${query}\`.\nChoose the track you want to play from the dropdown below!`,
            { title: 'Search Results' }
        );
        c.addActionRowComponents(row);
        await interaction.editReply((0, containers_1.cv2)(c));
    },

    // Prefix support (hybrid command)
    async prefixExecute(client, message, args) {
        const query = args.join(' ').trim();
        if (!query) {
            return message.reply((0, containers_1.cv2)((0, containers_1.error)('Please provide a search query!')));
        }
        const member = message.member;
        const voiceChannel = member?.voice?.channel;
        if (!voiceChannel) {
            return message.reply((0, containers_1.cv2)((0, containers_1.error)('You need to be in a voice channel to search music!')));
        }

        const node = client.music.shoukaku.getIdealNode();
        if (!node) return message.reply((0, containers_1.cv2)((0, containers_1.error)('Music servers are currently unavailable.')));

        const userConfig = await client.db.userConfig.findUnique({ where: { userId: message.author.id } });
        const engine = userConfig?.searchEngine || 'spsearch';
        const searchQuery = `${engine}:${query}`;
        const res = await node.rest.resolve(searchQuery).catch(() => null);
        if (!res || !['search', 'track', 'playlist'].includes(res.loadType) || !res.data) {
            return message.reply((0, containers_1.cv2)((0, containers_1.error)('No results found for that query.')));
        }

        const rawTracks = (res.loadType === 'search' || res.loadType === 'playlist')
            ? (Array.isArray(res.data) ? res.data : res.data?.tracks ?? [])
            : [res.data];
        const top10 = rawTracks.slice(0, 10);
        if (!top10.length) return message.reply((0, containers_1.cv2)((0, containers_1.error)('No results found.')));

        let kazagumoTracks;
        if (KazagumoTrack) {
            kazagumoTracks = top10.map(t => new KazagumoTrack(t, message.author));
        } else {
            kazagumoTracks = top10.map(t => ({ ...t, requester: message.author }));
        }

        const searchId = `search_${message.author.id}_${Date.now()}`;
        client.cache.set(searchId, kazagumoTracks, 120);

        const select = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId(`AuraX:search_select:${searchId}`)
            .setPlaceholder('Select a track to play...');
        top10.forEach((t, idx) => {
            const title  = (t.info?.title  || t.title  || 'Unknown Track').substring(0, 95);
            const author = (t.info?.author || t.author || 'Unknown Artist').substring(0, 95);
            select.addOptions({ label: title, description: author, value: idx.toString() });
        });

        const row = new discord_js_1.ActionRowBuilder().addComponents(select);
        const c = (0, containers_1.container)(
            `Found **${top10.length}** results for \`${query}\`.\nChoose the track you want to play from the dropdown below!`,
            { title: 'Search Results' }
        );
        c.addActionRowComponents(row);
        await message.reply((0, containers_1.cv2)(c));
    }
};
