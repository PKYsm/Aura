"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManager = void 0;
const types_1 = require("../types");
/** NOTE: QueueManager is currently unused legacy code. Kazagumo's internal player.queue is the source of truth. */
class QueueManager {
    tracks = [];
    history = [];
    loop = types_1.LoopMode.NONE;
    current = null;
    get size() {
        return this.tracks.length;
    }
    get totalDuration() {
        return this.tracks.reduce((acc, track) => acc + (track.length || 0), 0);
    }
    add(track, position) {
        const toAdd = Array.isArray(track) ? track : [track];
        if (position !== undefined && position >= 0 && position <= this.tracks.length) {
            this.tracks.splice(position, 0, ...toAdd);
        }
        else {
            this.tracks.push(...toAdd);
        }
    }
    remove(position) {
        if (position < 0 || position >= this.tracks.length)
            return null;
        return this.tracks.splice(position, 1)[0];
    }
    move(from, to) {
        if (from < 0 || from >= this.tracks.length || to < 0 || to >= this.tracks.length)
            return false;
        const [track] = this.tracks.splice(from, 1);
        this.tracks.splice(to, 0, track);
        return true;
    }
    shuffle() {
        for (let i = this.tracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
        }
    }
    clear() {
        this.tracks = [];
    }
    skipto(position) {
        if (position < 0 || position >= this.tracks.length)
            return [];
        return this.tracks.splice(0, position);
    }
    previous() {
        if (this.history.length === 0)
            return null;
        return this.history.pop() || null;
    }
}
exports.QueueManager = QueueManager;
