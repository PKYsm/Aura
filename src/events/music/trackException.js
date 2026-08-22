"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    name: 'playerException',
    emitter: 'music',
    execute: async (...args) => {
        const client = args.pop();
        const player = args[0];
        const data = args[1];
        console.error(`[MUSIC EXCEPTION] Guild: ${player.guildId}`, data);
        const guildPlayer = client.guildPlayers.get(player.guildId);
        if (guildPlayer) {
            guildPlayer.updateActivity();
        }
    }
};
