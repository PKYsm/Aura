"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const voiceStatus_1 = require("../../utils/voiceStatus");
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const presence_1 = require("../../utils/presence");
exports.default = {
    name: 'playerEmpty',
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
        if (guildPlayer && guildPlayer.autoplay && !guildPlayer.isStopped) {
            const previousTrack = player.queue.previous[0];
            if (previousTrack) {
                const query = previousTrack.author && previousTrack.author !== 'Unknown'
                    ? previousTrack.author
                    : previousTrack.title;
                const res = await client.music.search(query, { requester: client.user });
                if (res.tracks.length > 0) {
                    const previousUris = player.queue.previous.map(t => t.uri);
                    const newTracks = res.tracks.filter(t => !previousUris.includes(t.uri));
                    if (newTracks.length > 0) {
                        const randomTrack = newTracks[Math.floor(Math.random() * Math.min(newTracks.length, 5))];
                        player.queue.add(randomTrack);
                        if (!player.playing && !player.paused)
                            player.play();
                        return;
                    }
                }
            }
        }
        const botId = client.user.id;
        const c = (0, containers_1.container)("Queue have been ended");
        const row = new discord_js_1.ActionRowBuilder().addComponents(
            new discord_js_1.ButtonBuilder()
                .setLabel("Invite Bot")
                .setURL(`https://discord.com/api/oauth2/authorize?client_id=${botId}&permissions=8&scope=bot%20applications.commands`)
                .setStyle(discord_js_1.ButtonStyle.Link),
            new discord_js_1.ButtonBuilder()
                .setLabel("Support")
                .setURL("https://discord.gg/Vx43JXddFD")
                .setStyle(discord_js_1.ButtonStyle.Link)
        );
        c.addActionRowComponents(row);

        // Bug 1 fix: guildPlayer.textChannelId is updated on every play command so it
        // always points to the channel where the user last ran a command.
        // player.textId is set only at createPlayer() time and may be stale.
        const textChannelId = guildPlayer?.textChannelId || player.textId;

        // Delete the NowPlaying panel (trackEnd deletes it between tracks, but if the
        // last track ends and playerEnd fires before playerEmpty, it may already be gone).
        if (guildPlayer?.playerMessageId && textChannelId) {
            const panelChannel = client.channels.cache.get(textChannelId)
                || await client.channels.fetch(textChannelId).catch(() => null);
            if (panelChannel) {
                const msg = await panelChannel.messages.fetch(guildPlayer.playerMessageId).catch(() => null);
                if (msg) await msg.delete().catch(() => { });
            }
            guildPlayer.playerMessageId = null;
        }

        if (textChannelId) {
            const channel = client.channels.cache.get(textChannelId)
                || await client.channels.fetch(textChannelId).catch(() => null);
            if (channel) {
                await channel.send((0, containers_1.cv2)(c)).catch(() => { });
            }
        }
        // ── Bug 3 fix: leave VC after queue ends unless 24/7 mode is active ──
        // Checked AFTER sending the "queue ended" message so the user sees it first.
        try {
            const vc247 = await client.db.vc247.findUnique({ where: { guildId: player.guildId } });
            if (!vc247) {
                // Not in 24/7 mode — destroy the player so the bot leaves the VC.
                // Small delay so the queue-ended message lands before the disconnect.
                setTimeout(() => {
                    const p = client.music?.players?.get(player.guildId);
                    if (p && !p.playing && !p.paused) {
                        p.destroy();
                    }
                }, 3000);
            }
            // If vc247 IS active, bot stays in the VC silently (waiting for next play command).
        } catch { /* non-fatal — worst case bot stays in VC */ }
    }
};
