"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('loop')
        .setDescription('Toggle loop mode')
        .addStringOption(o => o.setName('mode').setDescription('Mode').setRequired(true).addChoices({ name: 'Track', value: 'track' }, { name: 'Queue', value: 'queue' }, { name: 'Off', value: 'none' })),
    category: 'music',
    aliases: ['repeat', 'l'],
    async execute(interaction, client) {
        const player = client.music.players.get(interaction.guildId);
        if (!player)
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('Nothing playing.')));
        const mode = interaction.options.getString('mode', true);
        if (!mode)
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('Please provide a mode: track, queue, none.')));
        player.setLoop(mode);
        await interaction.reply((0, containers_1.cv2)((0, containers_1.success)(`Loop mode set to **${mode}**.`)));
    }
};
