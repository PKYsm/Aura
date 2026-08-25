"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuildPlayer = void 0;
const QueueManager_1 = require("./QueueManager");
const FilterManager_1 = require("./FilterManager");
class GuildPlayer {
    player;
    queue; // Unused legacy queue property. Kazagumo's player.queue is the source of truth.
    filters;
    textChannel = null;
    textChannelId = null;
    playerMessageId = null;
    lastActivity;
    requesters = new Map();
    votes = { skip: new Set(), required: 0 };
    autoplay = false;
    isStopped = false;
    constructor(player) {
        this.player = player;
        this.queue = new QueueManager_1.QueueManager();
        this.filters = new FilterManager_1.FilterManager(player);
        this.lastActivity = Date.now();
    }
    async resendPanel(client, overrideTrack = null) {
        if (!this.textChannelId)
            return;
        const channel = client.channels.cache.get(this.textChannelId) || await client.channels.fetch(this.textChannelId).catch(() => null);
        if (!channel)
            return;
        if (this.playerMessageId) {
            const msg = await channel.messages.fetch(this.playerMessageId).catch(() => null);
            if (msg)
                await msg.delete().catch(() => { });
        }
        const { buildPlayerUI } = require('../ui/playerEmbed');
        const { cv2 } = require('../ui/containers');
        // Use the explicitly-passed track (from the playerStart event arg) when available.
        // Falling back to player.queue.current risks showing stale data if Kazagumo
        // hasn't updated current yet at the moment the event fires.
        const track = overrideTrack || this.player.queue.current;
        if (!track)
            return;
        const loopMode = this.player.loop === 'none' ? 0 : this.player.loop === 'track' ? 1 : 2;
        const ui = buildPlayerUI(this.player.guildId, track, this.player.position, this.player.playing, loopMode, this.player.queue.length, this.player.volume, this.autoplay);
        const newMsg = await channel.send(cv2(ui)).catch(() => null);
        if (newMsg)
            this.playerMessageId = newMsg.id;
    }
    updateActivity() {
        this.lastActivity = Date.now();
    }
    resetVotes(required) {
        this.votes = { skip: new Set(), required };
    }
}
exports.GuildPlayer = GuildPlayer;
