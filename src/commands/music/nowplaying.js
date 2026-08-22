"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
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
        const barLength = 20;
        const filled = Math.round((pos / dur) * barLength) || 0;
        const bar = '▬'.repeat(filled) + '🔘' + '▬'.repeat(Math.max(0, barLength - filled - 1));
        const formatTime = (ms) => {
            const sec = Math.floor((ms / 1000) % 60).toString().padStart(2, '0');
            const min = Math.floor((ms / (1000 * 60)) % 60).toString().padStart(2, '0');
            const hr = Math.floor(ms / (1000 * 60 * 60));
            return hr > 0 ? `${hr}:${min}:${sec}` : `${min}:${sec}`;
        };
        const content = `[**${current.title}**](${current.uri})\n\n\`${formatTime(pos)}\` ${bar} \`${formatTime(dur)}\``;
        await interaction.reply((0, containers_1.cv2)((0, containers_1.container)(content, { title: 'Now Playing' })));
    }
};
