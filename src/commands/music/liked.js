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
        .setName('liked')
        .setDescription('View and play your liked songs.')
        .addSubcommand(s => s.setName('list').setDescription('List your liked songs'))
        .addSubcommand(s => s.setName('play').setDescription('Play all your liked songs')),
    category: 'music',
    aliases: ['likedsongs', 'liked'],
    async prefixExecute(client, message, args) {
        const sub = args[0]?.toLowerCase() || 'list';
        if (sub === 'play') {
            await this.play(client, message);
        }
        else {
            await this.list(client, message);
        }
    },
    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand() || 'list';
        if (sub === 'play') {
            await this.play(client, interaction);
        }
        else {
            await this.list(client, interaction);
        }
    },
    async list(client, context) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const authorId = isInteraction ? context.user.id : context.author.id;
        try {
            const liked = await client.db.likedTrack.findMany({ where: { userId: authorId }, orderBy: { addedAt: 'desc' } });
            if (liked.length === 0) {
                return reply((0, containers_1.cv2)((0, containers_1.container)('You have no liked songs yet.', { title: 'Aura Liked Songs', color: 'default' })));
            }
            const content = liked.slice(0, 15).map((t, i) => `**${i + 1}.** [${t.title}](${t.uri})`).join('\n');
            const footer = liked.length > 15 ? `\n\n*...and ${liked.length - 15} more tracks*` : '';
            await reply((0, containers_1.cv2)((0, containers_1.container)(content + footer, { title: `# ${emojis_1.default.general.music} Your Liked Songs`, color: 'default', footer: 'Aura - Made By Aura Devs' })));
        }
        catch (e) {
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Error: ${e.message}`, { title: 'Aura Liked Songs', color: 'error' })));
        }
    },
    async play(client, context) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const authorId = isInteraction ? context.user.id : context.author.id;
        const member = context.member || await context.guild.members.fetch(authorId).catch(() => null);
        if (!member || !member.voice.channel) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('You must be in a voice channel to play music.', { title: 'Aura Liked Songs', color: 'error' })));
        }
        try {
            const liked = await client.db.likedTrack.findMany({ where: { userId: authorId }, orderBy: { addedAt: 'asc' } });
            if (liked.length === 0) {
                return reply((0, containers_1.cv2)((0, containers_1.container)('You have no liked songs to play.', { title: 'Aura Liked Songs', color: 'error' })));
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
            const { GuildPlayer } = require('../../managers/PlayerManager');
            let guildPlayer = client.guildPlayers.get(context.guildId);
            if (!guildPlayer) {
                guildPlayer = new GuildPlayer(player);
                client.guildPlayers.set(context.guildId, guildPlayer);
            }
            const m = await (isInteraction ? context.reply({ content: `${emojis_1.default.general.loading} Loading your liked songs...`, fetchReply: true }) : context.reply(`${emojis_1.default.general.loading} Loading your liked songs...`));
            let loaded = 0;
            for (const track of liked) {
                const res = await client.music.search(track.uri, { requester: context.user || context.author });
                if (res.tracks.length > 0) {
                    player.queue.add(res.tracks[0]);
                    loaded++;
                }
            }
            if (!player.playing && !player.paused) {
                player.play();
            }
            const successMsg = (0, containers_1.cv2)((0, containers_1.container)(`Added **${loaded}** liked songs to the queue!`, { title: 'Aura Liked Songs', color: 'success' }));
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
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Error playing liked songs: ${e.message}`, { title: 'Aura Liked Songs', color: 'error' })));
        }
    }
};
