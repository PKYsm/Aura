"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('queue')
        .setDescription('Shows the current music queue.'),
    aliases: ['q'],
    category: 'music',
    async execute(interaction, client) {
        const player = client.music.players.get(interaction.guildId);
        if (!player)
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.container)('No music is currently playing in this server.', { title: 'Error' })));
        if (player.queue.length === 0 && !player.queue.current) {
            return interaction.reply((0, containers_1.cv2)((0, containers_1.container)('The queue is empty.')));
        }
        const current = player.queue.current;
        let content = `**Now Playing**\n[${current?.title}](${current?.uri})\n\n**Up Next**\n`;
        const tracks = player.queue.slice(0, 10);
        if (tracks.length === 0)
            content += 'No more tracks in queue.';
        else {
            tracks.forEach((track, index) => {
                content += `**${index + 1}.** [${track.title}](${track.uri})\n`;
            });
        }
        if (player.queue.length > 10)
            content += `\n*...and ${player.queue.length - 10} more tracks.*`;
        await interaction.reply((0, containers_1.cv2)((0, containers_1.container)(content, { title: `Queue for ${interaction.guild?.name}` })));
    }
};
