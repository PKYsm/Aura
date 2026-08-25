'use strict';
const { Shoukaku, Connectors } = require('shoukaku');
const config = require('../../config');
const logger = require('../../logger');

/**
 * Boots the Shoukaku audio engine wired to the configured Lavalink node(s).
 */
function createAudioEngine(client) {
  const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), config.lavalink.nodes, {
    moveOnDisconnect: true,
    resume: true,
    resumeTimeout: 30,
    reconnectTries: 5,
    restTimeout: 10000,
  });

  shoukaku.on('ready', (name) => logger.audio.nodeReady(name));
  shoukaku.on('error', (name, error) => logger.audio.nodeError(name, error));
  shoukaku.on('close', (name, code, reason) => logger.audio.nodeClose(name, code, reason));
  shoukaku.on('disconnect', (name) => logger.audio.nodeDisconnect(name));

  return shoukaku;
}

/**
 * Resolves a raw user query into a Lavalink-ready search identifier.
 * Direct URLs pass through untouched; plain text queries are prefixed
 * with the configured default search engine — deliberately NOT YouTube.
 */
function resolveSearchQuery(query) {
  const isUrl = /^https?:\/\//i.test(query);
  if (isUrl) return query;
  return `${config.lavalink.defaultSearchEngine}:${query}`;
}

module.exports = { createAudioEngine, resolveSearchQuery };
