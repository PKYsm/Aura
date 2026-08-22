"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const lyrics_1 = require("./lyrics");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('disconnect')
        .setDescription('Disconnect from voice channel'),
    aliases: ['dc', 'leave'],
    category: 'music',
    async execute(interaction, client) {
        const player = client.music.players.get(interaction.guildId);
        if (!player)
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('I am not in a voice channel.')));
        try {
            await player.destroy();
        }
        catch (e) { }
        client.guildPlayers.delete(interaction.guildId);
        await (0, lyrics_1.endLyricsSessions)(client, interaction.guildId, 'Bot left the voice channel — synced lyrics session closed.');
        await interaction.reply((0, containers_1.cv2)((0, containers_1.success)('Disconnected from voice channel.')));
    }
};
