'use strict';
const logger = require('../../logger');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.system.ready(client.user.tag);
    client.user.setActivity('/play — powered by Aura');
  },
};
