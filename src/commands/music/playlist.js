"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const emojis_1 = __importDefault(require("../../utils/emojis"));
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('playlist')
        .setDescription('Manage your custom playlists.')
        .addSubcommand(s => s.setName('create').setDescription('Create a new playlist').addStringOption(o => o.setName('name').setDescription('Playlist name').setRequired(true)))
        .addSubcommand(s => s.setName('delete').setDescription('Delete a playlist').addStringOption(o => o.setName('name').setDescription('Playlist name').setRequired(true)))
        .addSubcommand(s => s.setName('add').setDescription('Add the currently playing track to a playlist').addStringOption(o => o.setName('name').setDescription('Playlist name').setRequired(true)))
        .addSubcommand(s => s.setName('list').setDescription('List your playlists or tracks in a playlist').addStringOption(o => o.setName('name').setDescription('Playlist name (optional)').setRequired(false)))
        .addSubcommand(s => s.setName('play').setDescription('Play a playlist').addStringOption(o => o.setName('name').setDescription('Playlist name').setRequired(true)))
        .addSubcommand(s => s.setName('addqueue').setDescription('Add the entire queue to a playlist').addStringOption(o => o.setName('name').setDescription('Playlist name').setRequired(true)))
        .addSubcommand(s => s.setName('info').setDescription('Get a list of all songs in a playlist').addStringOption(o => o.setName('name').setDescription('Playlist name').setRequired(true))),
    category: 'music',
    aliases: ['pl', 'playlist', 'save'],
    async prefixExecute(client, message, args) {
        let prefix = process.env.PREFIX || '$';
        try {
            const gConf = await client.db.guildConfig.findUnique({ where: { guildId: message.guildId } });
            if (gConf && gConf.prefix)
                prefix = gConf.prefix;
        }
        catch { }
        const sub = args[0]?.toLowerCase();
        if (message.content.includes('save')) {
            return this.addTrack(client, message, 'Liked Tracks', true);
        }
        if (sub === 'create') {
            await this.create(client, message, args.slice(1).join(' '));
        }
        else if (sub === 'delete') {
            await this.delete(client, message, args.slice(1).join(' '));
        }
        else if (sub === 'add') {
            await this.addTrack(client, message, args.slice(1).join(' '));
        }
        else if (sub === 'list') {
            await this.list(client, message, args.slice(1).join(' '));
        }
        else if (sub === 'play') {
            await this.play(client, message, args.slice(1).join(' '));
        }
        else if (sub === 'addqueue') {
            await this.addQueue(client, message, args.slice(1).join(' '));
        }
        else if (sub === 'info') {
            await this.info(client, message, args.slice(1).join(' '));
        }
        else {
            await message.reply((0, containers_1.cv2)((0, containers_1.container)(`Usage: \`${prefix}playlist <create|delete|add|list|play|addqueue|info> <name>\``, { title: 'Aura Playlists', color: 'default' })));
        }
    },
    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const name = interaction.options.getString('name');
        if (sub === 'create') {
            await this.create(client, interaction, name);
        }
        else if (sub === 'delete') {
            await this.delete(client, interaction, name);
        }
        else if (sub === 'add') {
            await this.addTrack(client, interaction, name);
        }
        else if (sub === 'list') {
            await this.list(client, interaction, name);
        }
        else if (sub === 'play') {
            await this.play(client, interaction, name);
        }
        else if (sub === 'addqueue') {
            await this.addQueue(client, interaction, name);
        }
        else if (sub === 'info') {
            await this.info(client, interaction, name);
        }
    },
    async create(client, context, name) {
        const isInteraction = !!context.isCommand;
        const reply = async (content) => {
            if (isInteraction) {
                return context.deferred || context.replied ? context.editReply(content) : context.reply(content);
            }
            return context.reply(content);
        };
        const authorId = isInteraction ? context.user.id : context.author.id;
        if (!name)
            return reply((0, containers_1.cv2)((0, containers_1.container)('Please provide a playlist name.', { title: 'Aura Playlists', color: 'error' })));
        try {
            const existing = await client.db.playlist.findFirst({ where: { userId: authorId, name } });
            if (existing) {
                return reply((0, containers_1.cv2)((0, containers_1.container)(`You already have a playlist named \`${name}\`.`, { title: 'Aura Playlists', color: 'error' })));
            }
            await client.db.playlist.create({ data: { userId: authorId, name } });
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Successfully created playlist \`${name}\`.`, { title: 'Aura Playlists', color: 'success' })));
        }
        catch (e) {
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Error creating playlist: ${e.message}`, { title: 'Aura Playlists', color: 'error' })));
        }
    },
    async delete(client, context, name) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const authorId = isInteraction ? context.user.id : context.author.id;
        if (!name)
            return reply((0, containers_1.cv2)((0, containers_1.container)('Please provide a playlist name.', { title: 'Aura Playlists', color: 'error' })));
        try {
            const existing = await client.db.playlist.findFirst({ where: { userId: authorId, name } });
            if (!existing) {
                const prefix = process.env.PREFIX || '$';
                return reply((0, containers_1.cv2)((0, containers_1.container)(`You do not have a playlist named \`${name}\`.`, { title: 'Aura Playlists', color: 'error' })));
            }
            await client.db.playlist.delete({ where: { id: existing.id } });
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Successfully deleted playlist \`${name}\`.`, { title: 'Aura Playlists', color: 'success' })));
        }
        catch (e) {
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Error deleting playlist: ${e.message}`, { title: 'Aura Playlists', color: 'error' })));
        }
    },
    async addTrack(client, context, name, isSaveAlias = false) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const authorId = isInteraction ? context.user.id : context.author.id;
        if (!name)
            return reply((0, containers_1.cv2)((0, containers_1.container)('Please provide a playlist name.', { title: 'Aura Playlists', color: 'error' })));
        const player = client.music.players.get(context.guildId);
        if (!player || !player.queue.current) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('No track currently playing.', { title: 'Aura Playlists', color: 'error' })));
        }
        const track = player.queue.current;
        try {
            let playlist = await client.db.playlist.findFirst({ where: { userId: authorId, name } });
            if (!playlist && isSaveAlias) {
                playlist = await client.db.playlist.create({ data: { userId: authorId, name: 'Liked Tracks' } });
            }
            if (!playlist) {
                const prefix = process.env.PREFIX || '$';
                return reply((0, containers_1.cv2)((0, containers_1.container)(`You do not have a playlist named \`${name}\`. Use \`$playlist create ${name}\` first.`, { title: 'Aura Playlists', color: 'error' })));
            }
            const existingTrack = await client.db.playlistTrack.findFirst({ where: { playlistId: playlist.id, uri: track.uri } });
            if (existingTrack) {
                return reply((0, containers_1.cv2)((0, containers_1.container)(`The track \`${track.title}\` is already in playlist \`${name}\`.`, { title: 'Aura Playlists', color: 'error' })));
            }
            await client.db.playlistTrack.create({
                data: {
                    playlistId: playlist.id,
                    title: track.title,
                    uri: track.uri,
                    author: track.author || 'Unknown',
                    duration: track.length || 0,
                    source: track.sourceName || 'unknown',
                    position: 0
                }
            });
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Added \`${track.title}\` to playlist \`${name}\`.`, { title: 'Aura Playlists', color: 'success' })));
        }
        catch (e) {
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Error adding to playlist: ${e.message}`, { title: 'Aura Playlists', color: 'error' })));
        }
    },
    async list(client, context, name) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const authorId = isInteraction ? context.user.id : context.author.id;
        try {
            if (!name) {
                const playlists = await client.db.playlist.findMany({ where: { userId: authorId }, include: { _count: { select: { tracks: true } } } });
                if (playlists.length === 0) {
                    return reply((0, containers_1.cv2)((0, containers_1.container)('You have no playlists.', { title: 'Aura Playlists', color: 'default' })));
                }
                const content = playlists.map(p => `${emojis_1.default.general.dot} **${p.name}** - ${p._count.tracks} tracks`).join('\n');
                await reply((0, containers_1.cv2)((0, containers_1.container)(content, { title: 'Your Playlists', color: 'default' })));
            }
            else {
                const playlist = await client.db.playlist.findFirst({ where: { userId: authorId, name }, include: { tracks: true } });
                if (!playlist) {
                    const prefix = process.env.PREFIX || '$';
                    return reply((0, containers_1.cv2)((0, containers_1.container)(`You do not have a playlist named \`${name}\`.`, { title: 'Aura Playlists', color: 'error' })));
                }
                if (playlist.tracks.length === 0) {
                    return reply((0, containers_1.cv2)((0, containers_1.container)(`Playlist \`${name}\` is empty.`, { title: `Playlist: ${name}`, color: 'default' })));
                }
                const content = playlist.tracks.slice(0, 15).map((t, i) => `**${i + 1}.** [${t.title}](${t.uri})`).join('\n');
                const footer = playlist.tracks.length > 15 ? `\n\n*...and ${playlist.tracks.length - 15} more tracks*` : '';
                await reply((0, containers_1.cv2)((0, containers_1.container)(content + footer, { title: `Playlist: ${name}`, color: 'default' })));
            }
        }
        catch (e) {
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Error listing playlists: ${e.message}`, { title: 'Aura Playlists', color: 'error' })));
        }
    },
    async play(client, context, name) {
        const isInteraction = !!context.isCommand;
        const reply = async (content) => {
            if (isInteraction) {
                return context.deferred || context.replied ? context.editReply(content) : context.reply(content);
            }
            return context.reply(content);
        };
        const authorId = isInteraction ? context.user.id : context.author.id;
        if (!name)
            return reply((0, containers_1.cv2)((0, containers_1.container)('Please provide a playlist name.', { title: 'Aura Playlists', color: 'error' })));
        const member = context.member || await context.guild.members.fetch(authorId).catch(() => null);
        if (!member || !member.voice.channel) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('You must be in a voice channel to play music.', { title: 'Aura Playlists', color: 'error' })));
        }
        try {
            const playlist = await client.db.playlist.findFirst({ where: { userId: authorId, name }, include: { tracks: true } });
            if (!playlist) {
                const prefix = process.env.PREFIX || '$';
                return reply((0, containers_1.cv2)((0, containers_1.container)(`You do not have a playlist named \`${name}\`.`, { title: 'Aura Playlists', color: 'error' })));
            }
            if (playlist.tracks.length === 0) {
                return reply((0, containers_1.cv2)((0, containers_1.container)(`Playlist \`${name}\` is empty.`, { title: 'Aura Playlists', color: 'error' })));
            }
            let player = client.music.players.get(context.guildId);
            if (!player) {
                player = await client.music.createPlayer({
                    guildId: context.guildId,
                    textId: context.channelId,
                    voiceId: member.voice.channel.id,
                    deaf: true,
                    shardId: context.guild.shardId
                });
            }
            const m = await (isInteraction ? context.reply({ content: `${emojis_1.default.general.loading} Loading playlist...`, fetchReply: true }) : context.reply(`${emojis_1.default.general.loading} Loading playlist...`));
            let loaded = 0;
            for (const track of playlist.tracks) {
                const res = await client.music.search(track.uri, { requester: context.user || context.author });
                if (res.tracks.length > 0) {
                    player.queue.add(res.tracks[0]);
                    loaded++;
                }
            }
            if (!player.playing && !player.paused) {
                player.play();
            }
            const successMsg = (0, containers_1.cv2)((0, containers_1.container)(`Added **${loaded}** tracks from \`${name}\` to the queue!`, { title: 'Aura Playlists', color: 'success' }));
            if (isInteraction) {
                await context.editReply(successMsg);
            }
            else {
                if (m)
                    await m.delete().catch(() => { });
                await context.reply(successMsg);
            }
        }
        catch (e) {
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Error playing playlist: ${e.message}`, { title: 'Aura Playlists', color: 'error' })));
        }
    },
    async addQueue(client, context, name) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const authorId = isInteraction ? context.user.id : context.author.id;
        if (!name)
            return reply((0, containers_1.cv2)((0, containers_1.container)('Please provide a playlist name.', { title: 'Aura Playlists', color: 'error' })));
        const player = client.music.players.get(context.guildId);
        if (!player || (!player.queue.current && player.queue.length === 0)) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('The queue is empty.', { title: 'Aura Playlists', color: 'error' })));
        }
        try {
            const playlist = await client.db.playlist.findFirst({ where: { userId: authorId, name } });
            if (!playlist) {
                return reply((0, containers_1.cv2)((0, containers_1.container)(`You do not have a playlist named \`${name}\`.`, { title: 'Aura Playlists', color: 'error' })));
            }
            const tracksToAdd = [];
            if (player.queue.current)
                tracksToAdd.push(player.queue.current);
            tracksToAdd.push(...player.queue);
            const existingTracks = await client.db.playlistTrack.findMany({ where: { playlistId: playlist.id } });
            const existingUris = new Set(existingTracks.map((t) => t.uri));
            let added = 0;
            let skipped = 0;
            for (const track of tracksToAdd) {
                if (!track.uri || existingUris.has(track.uri)) {
                    skipped++;
                    continue;
                }
                await client.db.playlistTrack.create({
                    data: {
                        playlistId: playlist.id,
                        title: track.title,
                        uri: track.uri,
                        author: track.author || 'Unknown',
                        duration: track.length || 0,
                        source: track.sourceName || 'unknown',
                        position: existingTracks.length + added
                    }
                });
                existingUris.add(track.uri);
                added++;
            }
            const skippedMsg = skipped > 0 ? `\n(Skipped ${skipped} duplicate songs)` : '';
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Added \`${added}\` new tracks from the queue to playlist \`${name}\`.${skippedMsg}`, { title: 'Aura Playlists', color: 'success' })));
        }
        catch (e) {
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Error: ${e.message}`, { title: 'Aura Playlists', color: 'error' })));
        }
    },
    async info(client, context, name) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const authorId = isInteraction ? context.user.id : context.author.id;
        if (!name)
            return reply((0, containers_1.cv2)((0, containers_1.container)('Please provide a playlist name.', { title: 'Aura Playlists', color: 'error' })));
        try {
            const playlist = await client.db.playlist.findFirst({ where: { userId: authorId, name }, include: { tracks: true } });
            if (!playlist) {
                return reply((0, containers_1.cv2)((0, containers_1.container)(`You do not have a playlist named \`${name}\`.`, { title: 'Aura Playlists', color: 'error' })));
            }
            if (playlist.tracks.length === 0)
                return reply((0, containers_1.cv2)((0, containers_1.container)(`Playlist \`${name}\` is empty.`, { title: `Playlist: ${name}`, color: 'default' })));
            const content = playlist.tracks.slice(0, 50).map((t, i) => `**${i + 1}.** [${t.title}](${t.uri})`).join('\n');
            const footer = playlist.tracks.length > 50 ? `\n\n*...and ${playlist.tracks.length - 50} more tracks*` : '';
            await reply((0, containers_1.cv2)((0, containers_1.container)(content + footer, { title: `Playlist: ${name}`, color: 'default' })));
        }
        catch (e) {
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Error: ${e.message}`, { title: 'Aura Playlists', color: 'error' })));
        }
    }
};
