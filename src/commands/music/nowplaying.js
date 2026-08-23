"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const format_1 = require("../../utils/format");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Shows what is currently playing.'),
    aliases: ['np'],
    category: 'music',
    async execute(interaction, client) {
        const player = client.music.players.get(interaction.guildId);
        if (!player || !player.queue.current) {
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.container)('Nothing playing.')));
        }
        const current = player.queue.current;
        const pos = player.position;
        const dur = current.length || 0;
        const barLine = `${format_1.formatTime(pos)} \`${format_1.progressBar(pos, dur)}\` ${format_1.formatTime(dur)}`;
        const content = `[**${current.title}**](${current.uri})\n\n${player.paused ? `${barLine} \` Song Is Paused\`` : barLine}`;
        await interaction.reply((0, containers_1.cv2)((0, containers_1.container)(content, { title: 'Now Playing' })));
    }
};
