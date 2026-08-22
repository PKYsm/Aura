"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const presence_1 = require("../../utils/presence");
const lyrics_1 = require("../../commands/music/lyrics");
exports.default = {
    name: 'playerClosed',
    emitter: 'music',
    execute: async (...args) => {
        const client = args.pop();
        const player = args[0];
        const data = args[1];
        const guildId = player?.guildId;
        if (!guildId) return;
        const guildPlayer = client.guildPlayers.get(guildId);
        if (guildPlayer) {
            guildPlayer.updateActivity();
        }
        client.guildPlayers.delete(guildId);
        try {
            player.destroy();
        }
        catch (e) { }
        (0, presence_1.updateBotPresence)(client);
        const code = data?.code ? ` (code ${data.code})` : '';
        await (0, lyrics_1.endLyricsSessions)(client, guildId, `Disconnected from voice${code} — synced lyrics session closed.`);
    }
};
