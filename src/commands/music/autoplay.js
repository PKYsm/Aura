"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Toggle autoplay mode'),
    aliases: ['ap'],
    category: 'music',
    async execute(interaction, client) {
        const guildPlayer = client.guildPlayers.get(interaction.guildId);
        if (!guildPlayer)
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('Nothing playing.')));
        guildPlayer.autoplay = !guildPlayer.autoplay;
        await interaction.reply((0, containers_1.cv2)((0, containers_1.success)(`Autoplay is now **${guildPlayer.autoplay ? 'enabled' : 'disabled'}**.`)));
    }
};
