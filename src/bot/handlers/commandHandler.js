'use strict';
const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');
const logger = require('../../logger');

/**
 * Loads every command module in src/bot/commands into a Collection
 * keyed by command name, and attaches it to client.commands.
 */
function loadCommands(client) {
  client.commands = new Collection();

  const commandsDir = path.join(__dirname, '..', 'commands');
  const files = fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    const command = require(path.join(commandsDir, file));
    if (!command?.data?.name) continue;
    client.commands.set(command.data.name, command);
  }

  logger.system.info(`Loaded ${client.commands.size} command(s)`);
  return client.commands;
}

/** Returns the raw JSON payloads used when registering slash commands. */
function getCommandData(client) {
  return [...client.commands.values()].map((c) => c.data.toJSON());
}

module.exports = { loadCommands, getCommandData };
