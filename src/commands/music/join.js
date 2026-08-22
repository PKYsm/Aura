"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const PlayerManager_1 = require("../../managers/PlayerManager");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('join')
        .setDescription('Join your voice channel'),
    aliases: ['j'],
    category: 'music',
    async execute(interaction, client) {
        const member = interaction.member;
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('You need to be in a voice channel!')));
        }
        let player = client.music.players.get(interaction.guildId);
        if (!player) {
            player = await client.music.createPlayer({
                guildId: interaction.guildId,
                textId: interaction.channelId,
                voiceId: voiceChannel.id,
                volume: 100,
            });
        }
        else {
            if (player.voiceId === voiceChannel.id) {
                return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('I am already in your voice channel.')));
            }
            if (player.queue.current) {
                return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('I am already playing music in another voice channel.')));
            }
            player.setVoiceChannel(voiceChannel.id);
        }
        let guildPlayer = client.guildPlayers.get(interaction.guildId);
        if (!guildPlayer) {
            guildPlayer = new PlayerManager_1.GuildPlayer(player);
            client.guildPlayers.set(interaction.guildId, guildPlayer);
        }
        await interaction.reply((0, containers_1.cv2)((0, containers_1.success)(`Joined **${voiceChannel.name}**.`)));
    }
};
