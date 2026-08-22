"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const lyrics_1 = require("./lyrics");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the current track and clear the queue.'),
    category: 'music',
    aliases: ['stop', 'leave'],
    async prefixExecute(client, message, args) {
        await this.handleAction(client, message);
    },
    async execute(interaction, client) {
        await this.handleAction(client, interaction);
    },
    async handleAction(client, context) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const player = client.music.players.get(context.guildId);
        if (!player) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('Not connected to a voice channel.', { title: 'Aura Music', color: 'error' })));
        }
        const member = context.member || await context.guild.members.fetch(isInteraction ? context.user.id : context.author.id).catch(() => null);
        if (!member || !member.voice.channel || member.voice.channel.id !== player.voiceId) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('You must be in the same voice channel as the bot.', { title: 'Aura Music', color: 'error' })));
        }
        try {
            const is247 = await client.db.vc247.findUnique({ where: { guildId: context.guildId } });
            const guildPlayer = client.guildPlayers.get(context.guildId);
            if (guildPlayer)
                guildPlayer.isStopped = true;
            if (is247) {
                player.queue.clear();
                player.shoukaku.stopTrack();
                await (0, lyrics_1.endLyricsSessions)(client, context.guildId, 'Playback stopped — synced lyrics session closed.');
                await reply((0, containers_1.cv2)((0, containers_1.container)('Stopped the music and cleared the queue. (24/7 Mode Active)', { title: 'Aura Music', color: 'success' })));
            }
            else {
                player.destroy();
                await (0, lyrics_1.endLyricsSessions)(client, context.guildId, 'Bot left the voice channel — synced lyrics session closed.');
                await reply((0, containers_1.cv2)((0, containers_1.container)('Stopped the music and left the voice channel.', { title: 'Aura Music', color: 'success' })));
            }
        }
        catch (e) {
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Failed to stop player: ${e.message}`, { title: 'Aura Music', color: 'error' })));
        }
    }
};
