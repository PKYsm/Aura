'use strict';
require('dotenv').config();

module.exports = {
  bot: {
    name: 'Aura',
    developer: 'RasaVedic',
    email: 'RasaVedic@Gmail.com',
    github: 'https://github.com/PKYsm',
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
  },

  theme: {
    name: 'Bright Pink',
    primaryColor: 0xff1493, // #FF1493
    hex: '#FF1493',
  },

  lavalink: {
    nodes: [
      {
        name: 'Aura-Main',
        url: process.env.LAVALINK_URL || 'localhost:2333',
        auth: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
        secure: process.env.LAVALINK_SECURE === 'true',
      },
    ],
    // Default search prefix — deliberately NOT YouTube.
    defaultSearchEngine: process.env.DEFAULT_SEARCH_ENGINE || 'spsearch',
  },

  database: {
    redisUrl: process.env.UPSTASH_REDIS_URL,
    jsonPath: './data/db.json',
    l1TtlMs: 5 * 60 * 1000, // 5 min
    l2TtlSeconds: 60 * 60, // 1 hr
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: './logs',
  },
};
