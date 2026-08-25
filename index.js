'use strict';
const { Client, GatewayIntentBits, Partials, REST, Routes } = require('discord.js');
const config = require('./src/config');
const logger = require('./src/logger');
const { createAudioEngine } = require('./src/audio/engine/connection');
const { loadCommands, getCommandData } = require('./src/bot/handlers/commandHandler');
const { loadComponents } = require('./src/bot/handlers/componentHandler');
const { loadEvents } = require('./src/bot/handlers/eventHandler');

async function bootstrap() {
  logger.system.info(`Booting ${config.bot.name} — built by ${config.bot.developer}`);

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
    ],
    partials: [Partials.Channel],
  });

  // Audio engine (Shoukaku wrapping Lavalink)
  const shoukaku = createAudioEngine(client);
  const ctx = { shoukaku };

  // Load commands / components / events
  loadCommands(client);
  loadComponents(client);
  loadEvents(client, ctx);

  // Register slash commands with Discord
  if (config.bot.token && config.bot.clientId) {
    const rest = new REST({ version: '10' }).setToken(config.bot.token);
    try {
      await rest.put(Routes.applicationCommands(config.bot.clientId), {
        body: getCommandData(client),
      });
      logger.system.info('Slash commands registered globally');
    } catch (error) {
      logger.system.error('Failed to register slash commands', { error: error.message });
    }
  }

  await client.login(config.bot.token);
}

bootstrap().catch((error) => {
  logger.system.error('Fatal boot error', { error: error.message });
  process.exit(1);
});
