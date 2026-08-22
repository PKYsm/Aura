"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('clearqueue')
        .setDescription('Clear the queue'),
    aliases: ['cq', 'clear'],
    category: 'music',
    async execute(interaction, client) {
        const player = client.music.players.get(interaction.guildId);
        if (!player)
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('Nothing playing.')));
        player.queue.clear();
        await interaction.reply((0, containers_1.cv2)((0, containers_1.success)('Queue cleared.')));
    }
};
