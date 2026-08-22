"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const voiceStatus_1 = require("../../utils/voiceStatus");
const presence_1 = require("../../utils/presence");
exports.default = {
    name: 'playerEnd',
    emitter: 'music',
    execute: async (...args) => {
        const client = args.pop();
        const player = args[0];
        const guildPlayer = client.guildPlayers.get(player.guildId);
        if (guildPlayer) {
            guildPlayer.updateActivity();
        }
        (0, presence_1.updateBotPresence)(client);
        if (player.voiceId) {
            await (0, voiceStatus_1.setVoiceChannelStatus)(client, player.voiceId, "<a:music:1515753259636228166> Waiting for music...");
        }
    }
};
