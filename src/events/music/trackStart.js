"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const voiceStatus_1 = require("../../utils/voiceStatus");
const PlayerManager_1 = require("../../managers/PlayerManager");
const presence_1 = require("../../utils/presence");
const stats = require("../../utils/stats");
exports.default = {
    name: 'playerStart',
    emitter: 'music',
    execute: async (...args) => {
        const client = args.pop();
        const player = args[0];
        const track = args[1];
        let guildPlayer = client.guildPlayers.get(player.guildId);
        if (!guildPlayer) {
            guildPlayer = new PlayerManager_1.GuildPlayer(player);
            client.guildPlayers.set(player.guildId, guildPlayer);
        }
        // ALWAYS sync textChannelId from the Kazagumo player's textId.
        // This covers the case where guildPlayer was freshly created here (textChannelId = null),
        // or where it existed but textChannelId got cleared (e.g. after a playerClosed/reconnect).
        // player.textId is set by createPlayer() in play.js, so it is always authoritative.
        if (!guildPlayer.textChannelId && player.textId) {
            guildPlayer.textChannelId = player.textId;
        }
        guildPlayer.updateActivity();
        (0, presence_1.updateBotPresence)(client);
        stats.trackSong(); // lifetime songs counter
        // Pass the track that the playerStart event supplied — this is always the newly
        // started track and avoids any race with player.queue.current being stale.
        await guildPlayer.resendPanel(client, track);
        if (player.voiceId) {
            const statusText = `<a:Playing:1513451285880246322> Listening to: ${track.title}`;
            await (0, voiceStatus_1.setVoiceChannelStatus)(client, player.voiceId, statusText);
        }
    }
};
