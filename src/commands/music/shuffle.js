"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the queue'),
    category: 'music',
    aliases: ['mix', 'sh'],
    async execute(interaction, client) {
        const player = client.music.players.get(interaction.guildId);
        if (!player)
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('Nothing playing.')));
        player.queue.shuffle();
        await interaction.reply((0, containers_1.cv2)((0, containers_1.success)('Queue shuffled.')));
    }
};
