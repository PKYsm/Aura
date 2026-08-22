"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBotPresence = updateBotPresence;
const discord_js_1 = require("discord.js");
function updateBotPresence(client) {
    const activePlayers = Array.from(client.music.players.values()).filter(p => p.playing && p.queue.current).length;
    const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);
    const latency = Math.round(client.ws.ping) || 0;
    const prefix = process.env.PREFIX || '$';
    client.user?.setPresence({
        activities: [{
                name: `Latency: ${latency}ms`,
                type: discord_js_1.ActivityType.Watching,
                state: `Enjoying music on ${activePlayers} server(s) & Prefix: ${prefix}`
            }],
        status: 'online',
        afk: false
    });
}
