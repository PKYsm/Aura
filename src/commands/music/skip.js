"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current track.'),
    category: 'music',
    aliases: ['skip', 's'],
    async prefixExecute(client, message, args) {
        await this.handleAction(client, message);
    },
    async execute(interaction, client) {
        await this.handleAction(client, interaction);
    },
    async handleAction(client, context) {
        const isInteraction = !!context.isCommand;
        const reply = async (content) => {
            if (isInteraction) {
                return context.deferred || context.replied ? context.editReply(content) : context.reply(content);
            }
            return context.reply(content);
        };
        const player = client.music.players.get(context.guildId);
        if (!player || !player.queue.current) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('No track currently playing.', { title: 'Aura Music', color: 'error' })));
        }
        const member = context.member || await context.guild.members.fetch(isInteraction ? context.user.id : context.author.id).catch(() => null);
        if (!member || !member.voice.channel || member.voice.channel.id !== player.voiceId) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('You must be in the same voice channel as the bot.', { title: 'Aura Music', color: 'error' })));
        }
        try {
            player.skip();
            await reply((0, containers_1.cv2)((0, containers_1.container)('Skipped the current track.', { title: 'Aura Music', color: 'default' })));
        }
        catch (e) {
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Failed to skip track: ${e.message}`, { title: 'Aura Music', color: 'error' })));
        }
    }
};
