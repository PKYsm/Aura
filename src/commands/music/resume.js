"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the player'),
    category: 'music',
    aliases: ['res', 'continue'],
    async execute(interaction, client) {
        const player = client.music.players.get(interaction.guildId);
        if (!player || !player.queue.current)
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('Nothing playing.')));
        if (!player.paused)
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('Player is already playing.')));
        player.pause(false);
        await interaction.reply((0, containers_1.cv2)((0, containers_1.success)('Resumed the player.')));
    }
};
