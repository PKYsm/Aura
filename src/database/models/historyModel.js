'use strict';
const db = require('../index');

const MAX_HISTORY = 25;

function keyFor(guildId) {
  return `history:${guildId}`;
}

module.exports = {
  /** Returns the ordered play-history array for a guild (most recent last). */
  async getHistory(guildId) {
    const history = await db.get(keyFor(guildId));
    return history ?? [];
  },

  /** Pushes a finished/started track onto the guild's history, capped at MAX_HISTORY. */
  async pushHistory(guildId, track) {
    const history = await this.getHistory(guildId);
    history.push({
      encoded: track.encoded,
      title: track.info.title,
      author: track.info.author,
      uri: track.info.uri,
      length: track.info.length,
      playedAt: Date.now(),
    });
    if (history.length > MAX_HISTORY) history.shift();
    await db.set(keyFor(guildId), history);
    return history;
  },

  /** Pops and returns the previous track for the "Prev" command. */
  async popPrevious(guildId) {
    const history = await this.getHistory(guildId);
    const previous = history.pop();
    await db.set(keyFor(guildId), history);
    return previous;
  },
};
