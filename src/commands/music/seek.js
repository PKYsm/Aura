"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('seek')
        .setDescription('Seek to a specific time')
        .addIntegerOption(o => o.setName('seconds').setDescription('Time in seconds').setRequired(true)),
    category: 'music',
    aliases: ['forward', 'jump'],
    async execute(interaction, client) {
        const player = client.music.players.get(interaction.guildId);
        if (!player || !player.queue.current)
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('Nothing playing.')));
        const seconds = interaction.options.getInteger('seconds', true);
        player.seek(seconds * 1000);
        await interaction.reply((0, containers_1.cv2)((0, containers_1.success)(`Seeked to **${seconds}s**`)));
    }
};
