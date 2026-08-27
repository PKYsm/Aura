"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const voiceStatus_1 = require("../../utils/voiceStatus");
const presence_1 = require("../../utils/presence");
const lyrics_1 = require("../../commands/music/lyrics");
exports.default = {
    name: 'playerEnd',
    emitter: 'music',
    execute: async (...args) => {
        const client = args.pop();
        const player = args[0];
        const guildPlayer = client.guildPlayers.get(player.guildId);
        if (guildPlayer) {
            guildPlayer.updateActivity();
            // Delete the NowPlaying panel immediately when the track ends.
            // trackStart will send a fresh one for the next track. This prevents
            // the old card from lingering between tracks.
            if (guildPlayer.playerMessageId) {
                const textChannelId = guildPlayer.textChannelId || player.textId;
                if (textChannelId) {
                    const channel = client.channels.cache.get(textChannelId)
                        || await client.channels.fetch(textChannelId).catch(() => null);
                    if (channel) {
                        const msg = await channel.messages.fetch(guildPlayer.playerMessageId).catch(() => null);
                        if (msg) await msg.delete().catch(() => { });
                    }
                }
                guildPlayer.playerMessageId = null; // cleared so resendPanel won't double-delete
            }
        }
        (0, presence_1.updateBotPresence)(client);
        if (player.voiceId) {
            await (0, voiceStatus_1.setVoiceChannelStatus)(client, player.voiceId, "<a:music:1515753259636228166> Waiting for music...");
        }
        await (0, lyrics_1.endLyricsSessions)(client, player.guildId, 'Track ended — synced lyrics session closed.');
    }
};
