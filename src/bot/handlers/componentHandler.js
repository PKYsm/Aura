'use strict';
const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');
const logger = require('../../logger');

/**
 * Loads every component module in src/bot/components into a Collection
 * keyed by customId, and attaches it to client.components.
 */
function loadComponents(client) {
  client.components = new Collection();

  const componentsDir = path.join(__dirname, '..', 'components');
  if (!fs.existsSync(componentsDir)) return client.components;

  const files = fs.readdirSync(componentsDir).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    const component = require(path.join(componentsDir, file));
    if (!component?.customId) continue;
    client.components.set(component.customId, component);
  }

  logger.system.info(`Loaded ${client.components.size} component handler(s)`);
  return client.components;
}

module.exports = { loadComponents };
