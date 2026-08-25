'use strict';
const { printToConsole } = require('./transports/consoleTransport');
const { writeToFile } = require('./transports/fileTransport');

/**
 * Core log dispatcher. Every helper below funnels through this so
 * console output and persisted file logs never drift apart.
 */
function log(category, level, message, meta = {}) {
  const payload = {
    ts: new Date().toISOString(),
    category,
    level,
    message,
    ...meta,
  };

  printToConsole(category, level, message, meta);
  writeToFile(category, payload);
}

module.exports = {
  /** Raw escape hatch if a module needs a custom category. */
  log,

  system: {
    ready: (tag) => log('SYSTEM', 'success', `Aura is online as ${tag}`),
    info: (message, meta) => log('SYSTEM', 'info', message, meta),
    error: (message, meta) => log('SYSTEM', 'error', message, meta),
  },

  command: {
    executed: (commandName, user, guild) =>
      log('COMMAND', 'info', `/${commandName} used`, {
        userId: user.id,
        userTag: user.tag,
        guildId: guild?.id ?? 'DM',
        guildName: guild?.name ?? 'DM',
      }),
    failed: (commandName, user, guild, error) =>
      log('COMMAND', 'error', `/${commandName} failed`, {
        userId: user.id,
        userTag: user.tag,
        guildId: guild?.id ?? 'DM',
        error: error?.message ?? String(error),
      }),
  },

  component: {
    interaction: (customId, user, guild, messageId) =>
      log('COMPONENT', 'info', `button "${customId}" tapped`, {
        userId: user.id,
        userTag: user.tag,
        guildId: guild?.id ?? 'DM',
        messageId,
      }),
  },

  audio: {
    trackStart: (guildId, track) =>
      log('AUDIO', 'info', 'stream started', {
        guildId,
        title: track?.info?.title,
        uri: track?.info?.uri,
      }),
    trackEnd: (guildId, track, reason) =>
      log('AUDIO', 'info', 'stream ended', {
        guildId,
        title: track?.info?.title,
        reason,
      }),
    playerError: (guildId, error) =>
      log('AUDIO', 'error', 'player error', {
        guildId,
        error: error?.message ?? String(error),
      }),
    nodeReady: (name) => log('AUDIO', 'success', `Lavalink node "${name}" ready`),
    nodeError: (name, error) =>
      log('AUDIO', 'error', `Lavalink node "${name}" error`, {
        error: error?.message ?? String(error),
      }),
    nodeClose: (name, code, reason) =>
      log('AUDIO', 'warn', `Lavalink node "${name}" closed`, { code, reason }),
    nodeDisconnect: (name) => log('AUDIO', 'warn', `Lavalink node "${name}" disconnected`),
  },

  database: {
    layerHit: (layer, key) => log('DATABASE', 'debug', `${layer} hit`, { key }),
    layerMiss: (layer, key) => log('DATABASE', 'debug', `${layer} miss`, { key }),
    error: (layer, key, error) =>
      log('DATABASE', 'error', `${layer} error`, { key, error: error?.message ?? String(error) }),
  },
};
