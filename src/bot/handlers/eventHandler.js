'use strict';
const fs = require('fs');
const path = require('path');
const logger = require('../../logger');

/**
 * Loads every event module in src/bot/events and binds it to the client.
 * Each event file exports { name, once?, execute(client, ...args, ctx) }.
 */
function loadEvents(client, ctx) {
  const eventsDir = path.join(__dirname, '..', 'events');
  const files = fs.readdirSync(eventsDir).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    const event = require(path.join(eventsDir, file));
    if (!event?.name || typeof event.execute !== 'function') continue;

    const handler = (...args) => event.execute(client, ...args, ctx);

    if (event.once) client.once(event.name, handler);
    else client.on(event.name, handler);
  }

  logger.system.info(`Loaded ${files.length} event(s)`);
}

module.exports = { loadEvents };
