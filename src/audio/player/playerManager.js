'use strict';
const logger = require('../../logger');
const historyModel = require('../../database/models/historyModel');

/**
 * guildId -> {
 *   player: ShoukakuPlayer,
 *   queue: Track[],
 *   textChannelId: string,
 *   playing: Track | null,
 * }
 */
const sessions = new Map();

function getSession(guildId) {
  return sessions.get(guildId);
}

async function createSession(shoukaku, guild, voiceChannelId, textChannelId) {
  const existing = sessions.get(guild.id);
  if (existing) return existing;

  const player = await shoukaku.joinVoiceChannel({
    guildId: guild.id,
    channelId: voiceChannelId,
    shardId: guild.shardId ?? 0,
  });

  const session = { player, queue: [], textChannelId, playing: null };
  sessions.set(guild.id, session);
  bindPlayerEvents(guild.id, session);
  return session;
}

function bindPlayerEvents(guildId, session) {
  session.player.on('start', (data) => {
    logger.audio.trackStart(guildId, session.playing);
  });

  session.player.on('end', async (data) => {
    logger.audio.trackEnd(guildId, session.playing, data?.reason);

    if (session.playing) {
      await historyModel.pushHistory(guildId, session.playing);
    }

    // reason "replaced" means a manual skip/prev already queued the next
    // track — avoid double-advancing the queue in that case.
    if (data?.reason !== 'replaced') {
      await playNext(guildId);
    }
  });

  session.player.on('exception', (data) => {
    logger.audio.playerError(guildId, data?.exception ?? data);
  });

  session.player.on('stuck', (data) => {
    logger.audio.playerError(guildId, `track stuck: ${data?.thresholdMs}ms`);
  });
}

function enqueue(guildId, track) {
  const session = getSession(guildId);
  if (!session) return;
  session.queue.push(track);
}

async function playNext(guildId) {
  const session = getSession(guildId);
  if (!session) return null;

  const next = session.queue.shift();
  if (!next) {
    session.playing = null;
    return null;
  }

  session.playing = next;
  await session.player.playTrack({ track: { encoded: next.encoded } });
  return next;
}

async function skip(guildId) {
  const session = getSession(guildId);
  if (!session) return null;

  if (session.playing) {
    await historyModel.pushHistory(guildId, session.playing);
  }
  return playNext(guildId);
}

async function prev(guildId) {
  const session = getSession(guildId);
  if (!session) return null;

  const previousTrack = await historyModel.popPrevious(guildId);
  if (!previousTrack) return null;

  if (session.playing) {
    session.queue.unshift(session.playing);
  }

  session.playing = previousTrack;
  await session.player.playTrack({ track: { encoded: previousTrack.encoded } });
  return previousTrack;
}

async function pause(guildId) {
  const session = getSession(guildId);
  if (!session) return false;
  await session.player.setPaused(true);
  return true;
}

async function resume(guildId) {
  const session = getSession(guildId);
  if (!session) return false;
  await session.player.setPaused(false);
  return true;
}

function destroySession(shoukaku, guildId) {
  const session = getSession(guildId);
  if (!session) return;
  shoukaku.leaveVoiceChannel(guildId);
  sessions.delete(guildId);
}

module.exports = {
  sessions,
  getSession,
  createSession,
  enqueue,
  playNext,
  skip,
  prev,
  pause,
  resume,
  destroySession,
};
